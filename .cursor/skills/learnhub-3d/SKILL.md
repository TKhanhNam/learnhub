---
name: learnhub-3d
description: >-
  Adds Coursera-like 3D polish to LearnHub web (CSS perspective, canvas 3D,
  tilt cards, overview stats). Use when the user asks for 3D, animation,
  tổng quan, visual polish, hero effects, or a more beautiful LearnHub UI.
---

# LearnHub 3D

## Rules
- Keep the light Coursera palette (`#0056d2`, `#f5f7fa`, white cards). Do not make the UI look like Steam.
- Prefer CSS 3D + a small canvas scene. Do not add Three.js unless the user asks for a real 3D model.
- Vietnamese copy uses diacritics; keep VI/EN switch.
- Honor `prefers-reduced-motion`.
- Do not edit CRS (`C:\HDV\crs-microservices`) for LearnHub UI.

## Where to apply
- Public site: hero + **Tổng quan** stats + course cards (`TiltCard`).
- Admin console: KPI cards on `/admin` overview.
- Motion: `perspective`, `rotateX/Y`, `translateZ`, slow canvas orbit. No flashy particles that hide text.
