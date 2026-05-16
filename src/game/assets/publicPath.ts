const stripPublicPrefix = (targetPath: string) => targetPath.replace(/^public\//, '').replace(/^\/+/, '');

export const publicAssetUrl = (targetPath: string) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${stripPublicPrefix(targetPath)}`;
};

export const versionedPublicAssetUrl = (targetPath: string, version: string) =>
  `${publicAssetUrl(targetPath)}?v=${encodeURIComponent(version)}`;
