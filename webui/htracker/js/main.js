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


var h3tracker = {
    frtbase: "/htracker/",
    base: "/htracker/",
    api: "/htracker/v1/",
    basetpl: "/htracker/~/htracker/tpl/",
    sys_version_sign: "1.0",
    debug: true,
    hotkey_ctrl_s: null,
    OpToolActive: null,
    UserLoginInit: 1 << 2,
}

h3tracker.urlver = function(debug_off) {
    var u = "?_v=" + h3tracker.sys_version_sign;
    if (!debug_off && h3tracker.debug) {
        u += "&_=" + Math.random();
    }
    return u;
}

h3tracker.Boot = function() {

    seajs.config({
        base: h3tracker.frtbase,
        alias: {
            ep: '~/lessui/js/eventproxy.js',
        },
    });

    seajs.use([
        // "~/lessui/js/browser-detect.js",
        "~/jquery/jquery.js",
        "~/lessui/js/eventproxy.js",
    ], function() {

        seajs.use([
            "~/bs/4/css/bootstrap.css",
            // "~/bs/4/js/bootstrap.js",
            "~/lessui/js/lessui.js" + h3tracker.urlver(),
            "~/lessui/css/lessui.css" + h3tracker.urlver(),
            "~/htracker/js/proc.js" + h3tracker.urlver(),
            "~/htracker/js/proj.js" + h3tracker.urlver(),
            "~/hchart/hchart.js" + h3tracker.urlver(),
            // "~/d3/d3.v4.js",
            // "~/d3-tip/d3-tip.js",
            // "~/d3-flamegraph/d3-flamegraph.js",
            // "~/d3-flamegraph/d3-flamegraph.css",
            "~/icono/icono.css",
        ], function() {

            hooto_chart.basepath = "/htracker/~/hchart";

            if (window.onload_hooks) {
                window.setTimeout(function() {
                    for (var i in window.onload_hooks) {
                        window.onload_hooks[i]();
                    }
                }, 1000);
            }

            h3tracker.load();
        });
    });
}

h3tracker.load = function() {

    l4i.UrlEventRegister("proc/index", htrackerProc.Index, "htracker-nav");
    l4i.UrlEventRegister("proj/index", htrackerProj.Index, "htracker-nav");

    seajs.use(["ep"], function(EventProxy) {

        var ep = EventProxy.create("tpl", "data", function(tpl, data) {

            if (!data.access_token || data.access_token.length < 10) {
                return h3tracker.AlertUserLogin();
            }

            htracker.ModuleNavbarLeftRefresh("htracker-proj-proclist-menus");
            htracker.OpToolsRefresh("#htracker-proj-proclist-optools");

            l4iTemplate.Render({
                dstid: "body-content",
                tplsrc: tpl,
                data: {
                    version: h3tracker.version,
                },
                callback: function() {
                    l4i.UrlEventHandler("proj/index", true);
                },
            });
        });

        ep.fail(function(err) {
            alert("NetWork error, Please try again later");
        });

        htracker.TplCmd("index", {
            callback: ep.done("tpl"),
        });

        htracker.ApiCmd("auth/session", {
            callback: ep.done("data"),
        });
    });
}

h3tracker.login_init_tpl = '<div id="htracker-user-login" class="alert"></div>\
<div class="form-group">\
  <label>Password</label>\
  <input type="password" class="form-control inputfocus" id="htracker-user-auth" placeholder="Enter password">\
</div>\
<div class="form-group">\
  <label>Retype Password</label>\
  <input type="password" class="form-control" id="htracker-user-auth-confirm" placeholder="Retype password">\
</div>';

h3tracker.login_tpl = '<div id="htracker-user-login" class="alert"></div>\
<div class="form-group">\
  <label>Password</label>\
  <input type="password" class="form-control inputfocus" id="htracker-user-auth" placeholder="Enter password">\
</div>';

h3tracker.login_relogin = "You are not logged in, or your login session has expired. Please sign in again";

h3tracker.AlertUserLogin = function(options) {

    var elem = document.getElementById("htracker-user-login");
    if (elem) {
        return;
    }

    options = options || {};

    var tpl = h3tracker.login_tpl;
    var msg = h3tracker.login_relogin;
    var height = 300;
    var title = "SIGN IN"
    var alert_type = "info";

    if (options.init) {
        tpl = h3tracker.login_init_tpl;
        msg = "This is your first login, please set a password";
        title = "Save";
        height += 60;
        alert_type = "warn";
    }

    l4iModal.Open({
        title: "Sign in with your Account",
        tplsrc: tpl,
        width: 600,
        height: height,
        buttons: [{
            title: title,
            onclick: "htracker.LoginCommit()",
            style: "btn-primary",
        }],
        callback: function(err, data) {
            l4i.InnerAlert("#htracker-user-login", alert_type, msg);
        },
    });
}

h3tracker.LoginCommit = function() {

    var req = {};
    var alert_id = "#htracker-user-login";

    try {
        req.auth = $("#htracker-user-auth").val();
        if (!req.auth) {
            throw "Invalid Request";
        }

        var confirm = $("#htracker-user-auth-confirm");
        if (confirm) {
            req.auth_confirm = confirm.val();
        }

    } catch (err) {
        return l4i.InnerAlert(alert_id, 'error', err);
    }

    htracker.ApiCmd("auth/login", {
        method: "POST",
        data: JSON.stringify(req),
        callback: function(err, data) {

            if (err) {
                return l4i.InnerAlert(alert_id, 'error', err);
            }

            if (!data || data.kind != "AuthSession") {
                var msg = "Bad Request";
                if (data.error) {
                    msg = data.error.message;
                }
                return l4i.InnerAlert(alert_id, 'error', msg);
            }

            l4i.InnerAlert(alert_id, 'alert-success', "Successfully Sign-on. Page redirecting ...");

            window.setTimeout(function() {
                window.location = "/htracker/";
            }, 1500);
        }
    })
}

h3tracker.UserSignOut = function() {
    htracker.ApiCmd("auth/sign-out", {
        callback: function(err, data) {
            l4iAlert.Open("info", "Successfully Sign-out. Page redirecting ...");
            window.setTimeout(function() {
                window.location = "/htracker/";
            }, 3000);
        }
    })
}


h3tracker.HttpSrvBasePath = function(url) {
    if (h3tracker.base == "") {
        return url;
    }

    if (url.substr(0, 1) == "/") {
        return url;
    }

    return h3tracker.base + url;
}

h3tracker.Ajax = function(url, options) {
    options = options || {};

    //
    if (url.substr(0, 1) != "/" && url.substr(0, 4) != "http") {
        url = h3tracker.HttpSrvBasePath(url);
    }

    l4i.Ajax(url, options)
}

h3tracker.ApiCmd = function(url, options) {
    if (options.nocache === undefined) {
        options.nocache = true;
    }

    var appcb = null;
    if (options.callback) {
        appcb = options.callback;
    }
    options.callback = function(err, data) {

        if (err && !data && err.length > 2 &&
            err[0] == "{" && err[err.length - 1] == "}") {
            data = JSON.parse(err);
        }

        if (data && typeof data === "string" && data.length > 2 &&
            data[0] == "{" && data[data.length - 1] == "}") {
            var dobj = JSON.parse(data);
            if (dobj) {
                data = dobj;
            }
        }

        if (data && typeof data === "object") {
            if (data.kind == "AuthSession" && data.action == h3tracker.UserLoginInit) {
                return h3tracker.AlertUserLogin({
                    init: true
                });
            }
            if (data.error && data.error.code == "401") {
                return h3tracker.AlertUserLogin();
            }
        }

        if (err == "Unauthorized") {
            return h3tracker.AlertUserLogin();
        }

        if (appcb) {
            appcb(err, data);
        }
    }

    h3tracker.Ajax(h3tracker.api + url, options);
}

h3tracker.TplPath = function(url, options) {
    return h3tracker.basetpl + url + ".tpl" + h3tracker.urlver();
}

h3tracker.TplCmd = function(url, options) {
    h3tracker.Ajax(h3tracker.basetpl + url + ".tpl" + h3tracker.urlver(), options);
}


h3tracker.Loader = function(target, uri, options) {
    h3tracker.Ajax(h3tracker.basetpl + uri + ".tpl" + h3tracker.urlver(), {
        async: false,
        callback: function(err, data) {
            if (err) {
                return alert("network error");
            }
            $(target).html(data);
            if (options && options.callback) {
                options.callback();
            }
        }
    });
}

h3tracker.UtilResSizeFormat = function(size, tofix) {
    if (!size) {
        return "0";
    }
    var ms = [
        [7, "ZB"],
        [6, "EB"],
        [5, "PB"],
        [4, "TB"],
        [3, "GB"],
        [2, "MB"],
        [1, "KB"],
    ];

    if (!tofix || tofix < 0) {
        tofix = 0;
    } else if (tofix > 3) {
        tofix = 3;
    }

    for (var i in ms) {
        if (size >= Math.pow(1024, ms[i][0])) {
            return (size / Math.pow(1024, ms[i][0])).toFixed(tofix) + " " + ms[i][1];
        }
    }

    if (size == 0) {
        return size;
    }

    return size + " B";
}

h3tracker.UtilTimeUptime = function(sec) {
    var s = [];

    var d = parseInt(sec / 86400);
    if (d > 1) {
        s.push(d + " days");
    } else if (d == 1) {
        s.push(d + " day");
    }

    var s2 = [];
    sec = sec % 86400;
    var h = parseInt(sec / 3600);
    if (h < 10) {
        s2.push("0" + h);
    } else {
        s2.push(h);
    }

    sec = sec % 3600;
    var m = parseInt(sec / 60);
    if (m < 10) {
        s2.push("0" + m);
    } else {
        s2.push(m);
    }

    sec = sec % 60;
    if (sec < 10) {
        s2.push("0" + sec);
    } else {
        s2.push(sec);
    }
    s.push(s2.join(":"));

    return s.join(", ");
}


h3tracker.ModuleNavbarMenu = function(name, items, active) {

    if (!items || items.length < 1) {
        return;
    }
    items = l4i.Clone(items);

    var elem = document.getElementById("htracker-module-navbar-menus");
    if (!elem) {
        $("#htracker-module-layout").html("<div id='htracker-module-navbar'>\
  <ul id='htracker-module-navbar-menus' class='htracker-module-nav'></ul>\
  <ul id='htracker-module-navbar-optools' class='htracker-module-nav htracker-nav-right'></ul>\
</div>\
<div id='htracker-module-content'></div>");
        h3tracker.module_navbar_menu_active = null;
    }

    h3tracker.ModuleNavbarMenuClean();

    var html = "";
    for (var i in items) {
        if (!items[i].style) {
            items[i].style = "";
        }
        if (items[i].uri == active) {
            items[i].style += " active";
        }
        if (items[i].onclick) {
            items[i]._onclick = "onclick=\"" + items[i].onclick + "\"";
        } else {
            items[i]._onclick = "";
        }
        html += "<li><a class='l4i-nav-item " + items[i].style + "' href='#" + items[i].uri + "' " + items[i]._onclick + ">" + items[i].name + "</a></li>";
    }
    $("#htracker-module-navbar-menus").html(html);
    l4i.UrlEventClean("htracker-module-navbar-menus");
}

h3tracker.ModuleNavbarMenuClean = function() {
    $("#htracker-module-navbar-menus").html("");
    l4i.UrlEventClean("htracker-module-navbar-menus");
}

h3tracker.ModuleNavbarMenuRefresh = function(div_target, cb) {
    if (!div_target) {
        return;
    }

    var elem = document.getElementById(div_target);
    if (!elem) {
        return;
    }
    $("#htracker-module-navbar-menus").html(elem.innerHTML);
    l4i.UrlEventClean("htracker-module-navbar-menus");

    if (cb && typeof cb === "function") {
        cb(null);
    }
}


h3tracker.ModuleNavbarLeftRefresh = function(div_target, cb) {
    if (!div_target) {
        return;
    }

    var elem = document.getElementById(div_target);
    if (!elem) {
        return;
    }
    var elemto = document.getElementById("htracker-module-navbar-left");
    if (!elemto) {
        $("#htracker-module-navbar").prepend("<ul id='htracker-module-navbar-left' class='htracker-module-nav'></ul>");
    }

    $("#htracker-module-navbar-left").html(elem.innerHTML);

    if (cb && typeof cb === "function") {
        cb(null);
    }
}

h3tracker.ModuleNavbarLeftClean = function() {
    $("#htracker-module-navbar-left").hide(100, function() {
        $("#htracker-module-navbar-left").remove();
    });
}

h3tracker.OpToolsRefresh = function(div_target, cb) {
    if (!div_target) {
        return;
    }

    if (!cb || typeof cb !== "function") {
        cb = function() {};
    }

    if (typeof div_target == "string" && div_target == h3tracker.OpToolActive) {
        return cb();
    }

    if (typeof div_target == "string") {

        var opt = $("#htracker-module-content").find(div_target);
        if (opt) {
            l4iTemplate.Render({
                dstid: "htracker-module-navbar-optools",
                tplsrc: opt.html(),
                data: {},
                callback: cb,
            });
            h3tracker.OpToolActive = div_target;
        }
    }
}

h3tracker.OpToolsClean = function() {
    $("#htracker-module-navbar-optools").html("");
    // $("#htracker-module-navbar-optools").css({"display": "none"});
    h3tracker.OpToolActive = null;
}

var htracker = h3tracker;
