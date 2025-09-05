# Migration Test Cases

This directory contains test cases and examples for the Statsig to LaunchDarkly migration agent.

## Structure

- `examples/` - Complete migration examples showing before/after code
- `fixtures/` - Test input files and expected output files

## Running Tests

These test files are used to validate the migration agent's behavior. They demonstrate:

1. Simple feature gate migrations
2. Dynamic config to JSON flag conversions
3. User context transformations
4. React component migrations
5. Experiment handling (preservation cases)
6. Observability plugin additions

## Contributing Test Cases

When adding new test cases:
1. Create a descriptive filename (e.g., `react-hooks-migration.js`)
2. Include both "BEFORE" (Statsig) and "AFTER" (LaunchDarkly) code
3. Add comments explaining any special considerations
4. Test edge cases and error scenarios