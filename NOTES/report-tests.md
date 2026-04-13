# Weekly Report MVP – Validation Notes

## Scope
This file documents lightweight validation coverage for `lib/report/fetchRaceData.ts` only.

## How to run
```
node lib/report/__tests__/fetchRaceData.test.mjs
```

## Covered cases
- Successful payload generation from a valid reportable race session
- Partial data handling when a source is unavailable (positions failure)
- Fastest lap omission when lap timing data is unavailable
- Stable output shape when podium/top finishers are incomplete
