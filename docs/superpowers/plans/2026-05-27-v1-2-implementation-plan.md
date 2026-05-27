# Simplify V1.2 Implementation Plan

> **Scope:** Simplify pipeline only. V1.1 remains unchanged; V1.2 is implemented as a separate version and folder.

## Goal

Add a new Simplify V1.2 backend and frontend path that can run beside the existing V1.1 flow, preserving the current V1.1 behavior while allowing V1.2 prompt, schema, routing, UI, and tests to evolve independently.

## Intended Files

- `backend/backend-processing/simplify/v1_2/` - new backend Simplify V1.2 package, copied from V1.1 where useful and adjusted for the V1.2 output contract.
- `backend/backend-processing/routes/simplify_v1_2.py` - new Flask route module for V1.2 endpoints.
- `frontend/simplify/src/pages/v1_2/` - new frontend Simplify V1.2 page components.
- Simplify frontend config and `App` route wiring - add navigation/routing for the V1.2 page without changing V1.1 routes.
- Tests - backend and frontend coverage for V1.2 behavior and routing.

## Work Plan

### 1. Backend V1.2 Package

- [ ] Create `backend/backend-processing/simplify/v1_2/`.
- [ ] Copy the minimum useful V1.1 backend structure into V1.2.
- [ ] Update V1.2 prompt and schema definitions in the new folder only.
- [ ] Keep V1.1 imports, prompts, schema, and behavior unchanged.
- [ ] Add package exports or imports needed by the new route.

### 2. Backend Route

- [ ] Add `backend/backend-processing/routes/simplify_v1_2.py`.
- [ ] Wire the route to call the V1.2 pipeline only.
- [ ] Match existing Simplify route conventions for request parsing, validation, logging, and error handling.
- [ ] Register the route with the backend app using the existing route registration pattern.
- [ ] Confirm V1.1 endpoints continue to resolve to the V1.1 pipeline.

### 3. Frontend V1.2 Page

- [ ] Create `frontend/simplify/src/pages/v1_2/`.
- [ ] Reuse V1.1 UI structure where appropriate, then adjust only for the V1.2 response shape.
- [ ] Add API calls for the V1.2 backend route.
- [ ] Keep V1.1 page files and behavior unchanged.

### 4. Config And App Route Wiring

- [ ] Add Simplify frontend config entries needed for the V1.2 API route.
- [ ] Add the V1.2 page route in the Simplify frontend `App` routing.
- [ ] Ensure the V1.1 route still points at the existing V1.1 page.
- [ ] Avoid changing unrelated app or product routes.

### 5. Tests

- [ ] Add backend tests for V1.2 request handling, pipeline invocation, response shape, and error cases.
- [ ] Add frontend tests for V1.2 routing, API integration boundaries, loading state, error state, and successful rendering.
- [ ] Add a regression check that V1.1 still uses the V1.1 route and pipeline.
- [ ] Run focused tests for touched backend and frontend areas.

## Acceptance Criteria

- V1.2 exists as a separate Simplify implementation under `backend/backend-processing/simplify/v1_2/`.
- V1.2 has its own backend route at `backend/backend-processing/routes/simplify_v1_2.py`.
- V1.2 has its own frontend page path under `frontend/simplify/src/pages/v1_2/`.
- Simplify frontend config and `App` routing expose V1.2 without changing V1.1 behavior.
- Tests cover the new V1.2 route, page, and V1.1 non-regression.
- The plan remains limited to the Simplify pipeline.
