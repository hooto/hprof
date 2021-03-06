
<div class="htracker-div-container alert less-hide" id="htracker-proj-proclist-alert"></div>

<div class="htracker-div-light" id="htracker-proj-proclist"></div>

<script type="text/html" id="htracker-proj-proclist-menus">
<li>
  <button type="button" class="btn btn-outline-primary btn-sm" onclick="htrackerProj.Index()">
    <span class="icon16 icono-caretLeftCircle"></span>
    <span>{[=l4i.T("Back")]}</span>
  </button>
</li>
<li>
  <div id="htracker-proj-proclist-status-msg" class="item-status-msg badge badge-light" style="display:none"></div>
</li>
</script>


<script type="text/html" id="htracker-proj-proclist-optools">
<li>
  <button class="btn btn-outline-danger btn-sm" onclick="htrackerProj.EntryDel()">
    <span class="icon16 icono-cross"></span>
    {[=l4i.T("Remove this Project")]}
  </button>
</li>
</script>

<script type="text/html" id="htracker-proj-proclist-tpl">
<table class="table table-hover valign-middle">
<thead>
  <tr>
    <th>PID</th>
    <th width="30%">{[=l4i.T("Command")]}</th>
    <th>{[=l4i.T("Created")]}</th>
    {[? it._hit]}<th>{[=l4i.T("Updated")]}</th>{[?]}
    {[? it._exit]}<th>{[=l4i.T("Exited")]}</th>{[?]}
    <th width="360px"></th>
  </tr>
</thead>
<tbody>

{[~it.items :v]}
<tr id="proj-{[=v.pid]}-{[=v.created]}">
  <td>{[=v.pid]}</td>
  <td>
    {[if (v.cmd.length > 160) {]}
      {[=v.cmd.substr(0, 150)]}...
    {[} else {]}
      {[=v.cmd]}
    {[}]}
  </td>
  <td>{[=l4i.UnixTimeFormat(v.created, "Y-m-d H:i")]}</td>
  {[? it._hit]}<td>{[=l4i.UnixTimeFormat(v.updated, "Y-m-d H:i")]}</td>{[?]}
  {[? it._exit]}<td>{[=l4i.UnixTimeFormat(v.exited, "Y-m-d H:i")]}</td>{[?]}
  <td align="right">
    <button class="btn {[if (v.traced > 100000000) {]}btn-outline-primary{[} else {]}btn-outline-secondary{[}]} btn-sm" onclick="htrackerProj.ProcDyTraceList('{[=v.proj_id]}', {[=v.pid]}, {[=v.created]})">
      <i class="icon16 icono-barChart"></i>
      {[=l4i.T("Dynamic Trace")]}
    </button>
    <button class="btn btn-outline-primary btn-sm" onclick="htrackerProj.ProcStats('{[=v.proj_id]}', {[=v.pid]}, {[=v.created]})">
      <i class="icon16 icono-areaChart"></i>
      {[=l4i.T("Resource Usage")]}
    </button>
  </td>
</tr>
{[~]}
</table>

</script>

