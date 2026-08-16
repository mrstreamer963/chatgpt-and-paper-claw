export function replaceObjectState<T extends object>(target: T, replacement: T) {
  for (const key of Object.keys(target)) Reflect.deleteProperty(target, key)
  Object.assign(target, replacement)
}
