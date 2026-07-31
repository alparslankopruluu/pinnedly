const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const MARKER = "# Fix fmt 11.0.2 consteval compilation with Xcode 26.4+";
const PATCH = `
    ${MARKER}
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '#  define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end
`;

module.exports = function withFmtXcode26Fix(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile",
      );

      if (!fs.existsSync(podfilePath)) {
        return modConfig;
      }

      const content = fs.readFileSync(podfilePath, "utf8");
      if (content.includes(MARKER)) {
        return modConfig;
      }

      const finalPostInstallEnd = content.lastIndexOf("\n  end\nend");
      if (finalPostInstallEnd === -1) {
        throw new Error("Unable to locate the Podfile post_install block");
      }

      const patched =
        content.slice(0, finalPostInstallEnd) +
        PATCH +
        content.slice(finalPostInstallEnd);
      fs.writeFileSync(podfilePath, patched);

      return modConfig;
    },
  ]);
};
