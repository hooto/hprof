[project]
name = hooto-tracker
version = 0.1.4
vendor = hooto.com
homepage = https://github.com/hooto/htracker
groups = dev/sys-srv

%build
export PATH=$PATH:/usr/local/go/bin:/opt/gopath/bin
export GOPATH=/opt/gopath

mkdir -p {{.buildroot}}/etc
mkdir -p {{.buildroot}}/bin
mkdir -p {{.buildroot}}/misc/inpack
mkdir -p {{.buildroot}}/var/{log,tmp,tracker_db}
mkdir -p {{.buildroot}}/webui

go build -ldflags "-X main.version={{.project__version}} -X main.release={{.project__release}}" -o {{.buildroot}}/bin/hooto-tracker main.go
# go build -ldflags "-s -w" -o {{.buildroot}}/bin/burn  vendor/github.com/spiermar/burn/main.go

sed -i 's/debug:\!0/debug:\!1/g' {{.buildroot}}/webui/htracker/js/main.js
sed -i 's/debug:true/debug:false/g' {{.buildroot}}/webui/htracker/js/main.js
sed -i 's/debug:\ true/debug:\ false/g' {{.buildroot}}/webui/htracker/js/main.js

rm -rf /tmp/rpmbuild/*
mkdir -p /tmp/rpmbuild/{BUILD,RPMS,SOURCES,SPECS,SRPMS,BUILDROOT}

mkdir -p /tmp/rpmbuild/SOURCES/hooto-tracker-{{.project__version}}/
rsync -av {{.buildroot}}/* /tmp/rpmbuild/SOURCES/hooto-tracker-{{.project__version}}/

sed -i 's/__version__/{{.project__version}}/g' /tmp/rpmbuild/SOURCES/hooto-tracker-{{.project__version}}/misc/inpack/rpm.spec
sed -i 's/__release__/{{.project__release}}/g' /tmp/rpmbuild/SOURCES/hooto-tracker-{{.project__version}}/misc/inpack/rpm.spec

cd /tmp/rpmbuild/SOURCES/
tar zcf hooto-tracker-{{.project__version}}.tar.gz hooto-tracker-{{.project__version}}

rpmbuild --define "debug_package %{nil}" -ba /tmp/rpmbuild/SOURCES/hooto-tracker-{{.project__version}}/misc/inpack/rpm.spec \
  --define='_tmppath /tmp/rpmbuild' \
  --define='_builddir /tmp/rpmbuild/BUILD' \
  --define='_topdir /tmp/rpmbuild' \
  --define='dist .{{.project__dist}}'

%files
misc/
deps/FlameGraph/*.pl
webui/htracker/img/ht-topnav-light.png
webui/htracker/img/ht-tab-dark.png

%js_compress
webui/

%css_compress
webui/

%html_compress
webui/

%png_compress

