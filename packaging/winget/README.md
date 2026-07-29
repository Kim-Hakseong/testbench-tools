# winget manifests

Manifests for publishing the three desktop apps to the Windows Package Manager
community repository, so `winget install TestBenchTools.ModbusWorkbench` works.

Worth doing for two reasons beyond convenience: winget does **not** require a
code-signing certificate, and a package in the community repository is a
Microsoft-hosted listing that search engines index — both of which the apps
otherwise lack.

## Layout

```
packaging/winget/<PackageIdentifier>/<Version>/
  <PackageIdentifier>.yaml                 version manifest
  <PackageIdentifier>.installer.yaml       url + SHA-256
  <PackageIdentifier>.locale.en-US.yaml    name, description, licence, tags
```

`InstallerType: portable` — these are single-file self-contained builds with
nothing to install, so winget puts the executable on PATH instead of running an
installer.

The `InstallerSha256` values match the ones published on
https://testbench.tools/apps/ and the digests GitHub reports for the release
assets. **They must be re-taken on every release**, along with `PackageVersion`,
`InstallerUrl`, `ReleaseDate` and `ReleaseNotesUrl`:

```sh
gh api repos/Kim-Hakseong/<repo>/releases \
  -q '.[0] | .tag_name as $t | .assets[] | "\($t) \(.name) \(.digest)"'
```

winget wants the hash uppercase and without the `sha256:` prefix.

## Submitting

Validate locally on a Windows machine first:

```powershell
winget validate --manifest <path to the version folder>
winget install --manifest <path to the version folder>   # installs it for real
```

Then open a pull request against
[microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs), copying each
folder to `manifests/t/TestBenchTools/<PackageName>/<Version>/`. A bot validates
the manifest and a moderator reviews it.

Submit one package first and wait for it to be merged before sending the others —
three simultaneous first-time submissions from a new publisher get more scrutiny,
and any correction the reviewer asks for on the first will apply to all three.

`ManifestVersion` is pinned to 1.6.0 here. If the repository has moved on, run
`winget validate` and update the three `ManifestVersion` lines plus the schema
URLs in the header comments together.
