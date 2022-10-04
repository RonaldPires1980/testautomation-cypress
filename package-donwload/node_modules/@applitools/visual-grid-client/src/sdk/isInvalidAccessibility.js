function isInvalidAccessibility(accessibility = []) {
  const accessibilityTypes = [
    'IgnoreContrast',
    'RegularText',
    'LargeText',
    'BoldText',
    'GraphicalObject',
  ]
  const accObjects = [].concat(accessibility)
  const err = []
  const typeMsg = `Valid accessibilityType values are: ${accessibilityTypes.join(', ')}`
  for (const acc of accObjects) {
    if (acc.accessibilityType && !accessibilityTypes.includes(acc.accessibilityType)) {
      err.push(
        `The region ${JSON.stringify(acc)} has an invalid accessibilityType of: ${
          acc.accessibilityType
        } `,
      )
      !err.length && err.unshift(typeMsg)
    }
  }
  return err.join('\n')
}

module.exports = isInvalidAccessibility
