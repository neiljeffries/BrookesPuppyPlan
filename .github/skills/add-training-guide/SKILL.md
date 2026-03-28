---
name: add-training-guide
description: "Use when: adding a new training guide, command guide, or behaviour guide to the training page. Covers creating the expansion panel, step timeline, Yorkie-specific content, and matching icon/color styles."
---

# Add Training Guide

## When to Use
- User asks to add a new training guide (e.g., "add a leash training guide", "add a crate training guide")
- User wants a new command in the Guides accordion (e.g., "add a Down command guide")
- User wants to expand the training content with a new topic

## Project Context
- **Framework**: Angular with Angular Material
- **Training component**: `src/app/training/training.ts`, `training.html`, `training.css`
- **Content style**: Cesar Millan's dog training methods, tailored for Yorkshire Terriers
- **Guide format**: Material expansion panels inside a `<mat-accordion>` on the Guides tab (tab index 3)

## Guide Template

Each guide follows this exact HTML pattern inside the `<mat-accordion>` in the Guides tab:

```html
<!-- Guide Name -->
<mat-expansion-panel>
  <mat-expansion-panel-header>
    <mat-panel-title>
      <mat-icon class="guide-icon ICON_COLOR_CLASS">ICON_NAME</mat-icon> GUIDE_TITLE
    </mat-panel-title>
  </mat-expansion-panel-header>
  <div class="guide-content">
    <div class="steps-timeline">
      <div class="step">
        <div class="step-number">1</div>
        <mat-card>
          <mat-card-header><mat-card-title>Step Title</mat-card-title></mat-card-header>
          <mat-card-content>
            <p>Step description with Yorkie-specific details.</p>
          </mat-card-content>
        </mat-card>
      </div>
      <!-- Repeat for each step -->
    </div>
  </div>
</mat-expansion-panel>
```

## Available Icon Color Classes
- `icon-green` — #e8f5e9 bg, #2e7d32 text
- `icon-blue` — #e3f2fd bg, #1565c0 text
- `icon-purple` — #f3e5f5 bg, #7b1fa2 text
- `icon-orange` — #fff3e0 bg, #e65100 text
- `icon-red` — #ffebee bg, #c62828 text
- `icon-teal` — #e0f2f1 bg, #00695c text
- `icon-amber` — #fff8e1 bg, #f57f17 text
- `icon-pink` — #fce4ec bg, #c2185b text
- `icon-indigo` — #e8eaf6 bg, #283593 text

## Content Guidelines
1. Write 5-8 steps per guide (match existing guides)
2. Every step must include Yorkie-specific advice (small size, sensitive trachea, stubborn temperament, tiny bladder, vocal nature)
3. Reference Cesar Millan's core principles: exercise first, calm-assertive energy, nose-eyes-ears, no affection during excited states
4. Use British English spelling (centre, behaviour, practise)
5. Keep step descriptions to 2-4 sentences

## Procedure
1. Read `src/app/training/training.html` to find the Guides `<mat-accordion>` section
2. Choose a Material icon name and color class that fits the topic
3. Add the new `<mat-expansion-panel>` before the closing `</mat-accordion>` tag
4. Write 5-8 steps following Cesar Millan's method, tailored for Yorkies
5. Verify the build compiles with `npx ng build`
