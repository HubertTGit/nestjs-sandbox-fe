function readPackage(pkg) {
  if (pkg.name === 'openapi-typescript') {
    if (pkg.peerDependencies) {
      delete pkg.peerDependencies.typescript
    }
    pkg.dependencies = {
      ...pkg.dependencies,
      typescript: '^5.9.3',
    }
  }
  return pkg
}

module.exports = {
  hooks: {
    readPackage,
  },
}
