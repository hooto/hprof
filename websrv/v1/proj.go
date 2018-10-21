// Copyright 2018 Eryx <evorui аt gmail dοt com>, All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package v1

import (
	"strings"
	"time"

	"github.com/hooto/hlog4g/hlog"
	"github.com/hooto/httpsrv"
	"github.com/lessos/lessgo/types"
	"github.com/lynkdb/iomix/skv"
	"github.com/shirou/gopsutil/process"

	"github.com/hooto/htracker/config"
	"github.com/hooto/htracker/data"
	"github.com/hooto/htracker/hapi"
	"github.com/hooto/htracker/websrv/auth"
)

type Proj struct {
	*httpsrv.Controller
}

var (
	projListCacheNum = 0
)

func (c *Proj) Init() int {

	if config.Config.Auth == "" {
		c.RenderJson(auth.AuthErrInitAuth)
		return 1
	}

	if sess := auth.AuthSessionInstance(c.Session); sess == nil {
		c.RenderJson(auth.AuthErrUnAuth)
		return 1
	}

	return 0
}

func (c Proj) ListAction() {

	var sets hapi.ProjList
	defer c.RenderJson(&sets)

	var (
		limit  = int(c.Params.Int64("limit"))
		closed = c.Params.Get("filter_closed")
		off    = c.Params.Get("offset")
		ptype  = "active"
		pptype = "hit"
	)

	if limit < 10 {
		limit = 10
	} else if limit > 100 {
		limit = 100
	}

	if closed == "true" {
		ptype = "hist"
		pptype = "exit"
	}

	if off == "" {
		off = "Z"
	}

	var (
		offset = hapi.DataPathProjEntry(ptype, off)
		cutset = hapi.DataPathProjEntry(ptype, "")
	)

	rs := data.Data.KvRevScan([]byte(offset), []byte(cutset), limit)
	if !rs.OK() {
		return
	}

	n := rs.KvEach(func(entry *skv.ResultEntry) int {
		var set hapi.ProjEntry
		if err := entry.Decode(&set); err == nil {
			if ptype == "active" && set.Closed > 0 {
				return 0
			}

			mkey := hapi.DataPathProjProcEntry(pptype, set.Id, 0, 0)
			if rs2 := data.Data.KvProgGet(mkey); rs2.OK() {
				if meta := rs2.Meta(); meta != nil {
					set.ProcNum = int(meta.Num)
				}
			}
			sets.Items = append(sets.Items, &set)
		}
		return 0
	})
	if n > 0 {
		projListCacheNum = n
	}

	sets.Kind = "ProjList"
}

func (c Proj) SetAction() {

	var set hapi.ProjEntry
	defer c.RenderJson(&set)

	if config.Config.RunMode == "demo" {
		set.Error = types.NewErrorMeta("400", "Operate Denied in DEMO mode")
		return
	}

	if err := c.Request.JsonDecode(&set); err != nil {
		set.Error = types.NewErrorMeta("400", "Invalid Request "+err.Error())
		return
	}

	if projListCacheNum > 100 {
		set.Error = types.NewErrorMeta("400", "too many projects created (n <= 100)")
		return
	}

	set.Created = uint32(time.Now().Unix())
	set.Name = strings.TrimSpace(set.Name)

	if set.Filter.ProcId > 0 {
		p, err := process.NewProcess(set.Filter.ProcId)
		if err != nil {
			set.Error = types.NewErrorMeta("400", "PID Not Found")
			return
		}
		var (
			name, _    = p.Name()
			created, _ = p.CreateTime()
		)
		set.Filter.ProcCreated = uint32(created / 1e3)
		if set.Name == "" {
			set.Name = name
		}

	} else if set.Filter.ProcName != "" {

		set.Filter.ProcName = strings.TrimSpace(set.Filter.ProcName)
		if set.Filter.ProcName == "" {
			set.Error = types.NewErrorMeta("400", "Process Name Not Found")
			return
		}

		if set.Name == "" {
			set.Name = set.Filter.ProcName
		}

	} else if set.Filter.ProcCommand != "" {

		set.Filter.ProcCommand = strings.TrimSpace(set.Filter.ProcCommand)
		if set.Filter.ProcCommand == "" {
			set.Error = types.NewErrorMeta("400", "Process Command Not Found")
			return
		}

	} else {
		set.Error = types.NewErrorMeta("400", "Invalid Request : ProjFilter")
		return
	}

	if set.Name == "" {
		set.Error = types.NewErrorMeta("400", "Project Name Not Found")
		return
	}

	set.Id = hapi.ObjectId(set.Created, 8)
	key := hapi.DataPathProjActiveEntry(set.Id)

	if rs := data.Data.KvGet([]byte(key)); rs.OK() {
		set.Error = types.NewErrorMeta("400", "Tracker already exists")
		return
	} else if !rs.NotFound() {
		set.Error = types.NewErrorMeta("400", "Server Error")
		return
	}

	if rs := data.Data.KvPut([]byte(key), set, nil); !rs.OK() {
		set.Error = types.NewErrorMeta("400", "Server Error")
		return
	}

	hlog.Printf("info", "Project/New %s", set.Id)

	projListCacheNum += 1

	set.Kind = "ProjEntry"
}

func (c Proj) DelAction() {

	var (
		set  types.TypeMeta
		id   = c.Params.Get("id")
		key  = hapi.DataPathProjActiveEntry(id)
		prev hapi.ProjEntry
	)
	defer c.RenderJson(&set)

	if config.Config.RunMode == "demo" {
		set.Error = types.NewErrorMeta("400", "Operate Denied in Demo Mode")
		return
	}

	if rs := data.Data.KvGet([]byte(key)); rs.NotFound() {
		set.Error = types.NewErrorMeta("400", "No Tracker Found")
	} else if !rs.OK() {
		set.Error = types.NewErrorMeta("500", "Server Error")
	} else {
		if err := rs.Decode(&prev); err != nil {
			set.Error = types.NewErrorMeta("500", "Invalid Object Define")
		} else {

			prev.Closed = uint32(time.Now().Unix())

			key_history := hapi.DataPathProjHistoryEntry(id)
			if rs := data.Data.KvPut([]byte(key_history), prev, nil); !rs.OK() {
				set.Error = types.NewErrorMeta("400", "Server Error")
			} else if rs := data.Data.KvPut([]byte(key), prev, nil); !rs.OK() {
				set.Error = types.NewErrorMeta("500", "Server Error")
			} else {
				set.Kind = "ProjEntry"

				hlog.Printf("info", "Project/Remove %s", id)

				projListCacheNum -= 1
			}
		}
	}
}
