"""Resolve the pinned Windows Qt SDK through its split MSVC repository.

aqtinstall 3.3.0 uses the previous metadata location for this kit. Only metadata
discovery is adapted; aqt retains checksums, download, extraction and relocation.
"""

from importlib.metadata import version
import json
from pathlib import Path
import sys

VERSION = "6.12.0"
ARCH = "win64_msvc2022_64"


def windows_repositories(host, target, qt_version, arch):
    if (host, target, qt_version, arch) != ("windows", "desktop", VERSION, ARCH):
        raise RuntimeError("Repository adapter only accepts Qt 6.12.0 Windows MSVC2022 x64")
    return ("online/qtsdkrepository/windows_x86/desktop/qt6_6120/qt6_6120_msvc2022_64",)


def main():
    contract = Path(__file__).resolve().parents[1] / "packages/sdk/host-contract.json"
    if json.loads(contract.read_text(encoding="utf-8"))["qtVersion"] != VERSION:
        raise RuntimeError("Audit the official repository layout before changing Qt")
    if version("aqtinstall") != "3.3.0":
        raise RuntimeError("Repository adapter requires aqtinstall 3.3.0")
    import aqt
    from aqt import installer
    from aqt.archives import QtArchives, UpdateXmls

    class DesktopArchives(QtArchives):
        def _get_archives(self):
            repositories = windows_repositories(
                self.os_name, self.target, str(self.version), self.arch
            )
            updates = [
                UpdateXmls(repository, self._download_update_xml(repository + "/Updates.xml"))
                for repository in repositories
            ]
            self._parse_update_xmls(updates, self._target_packages())

    installer.QtArchives = DesktopArchives
    return aqt.main()


if __name__ == "__main__":
    sys.exit(main())
