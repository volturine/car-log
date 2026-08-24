## Summary

<!-- What does this PR change, and why? -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor / chore
- [ ] Security-related

## How tested

<!-- e.g. just verify; manual check as customer + shop owner; Docker compose -->

- [ ] `just verify` passes locally
- [ ] Added or updated tests (if applicable)

## Security notes

<!-- Required if this touches auth, authorization, the repair workflow,
     payments, photo uploads, invites, or logging. -->

- [ ] Authorization derived server-side from the session (no client-provided IDs trusted)
- [ ] Role model preserved: customers see own data only, shops see assigned repairs only
- [ ] No secrets or personal owner data added to logs/metrics/error responses

## Related issues

<!-- Closes #… -->
