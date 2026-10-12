import { stackfoldLinks } from './links';

export const currentRelease = {
  version: 'v0.1.0',
  macosAppleSilicon: `${stackfoldLinks.repository}/releases/download/v0.1.0/Stackfold_0.1.0_aarch64.dmg`,
  sha256: 'b7e54cc819ba0affee5615423b9bae7ea9cb6f234c025360fb3db7b82b9b5422',
  size: '5.8 MB',
  gatekeeperCommand: 'xattr -cr /Applications/Stackfold.app',
  platformLabel: 'macOS 12+ (Apple Silicon)',
} as const;
