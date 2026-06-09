---
name: "Atelie Guadalupe"
description: "A devout artisan storefront for natural tallow products and handmade goods."
colors:
    guadalupe-blue: "#1940b3"
    guadalupe-blue-ring: "#1940b34d"
    gilded-craft: "#d1a054"
    soft-relic: "#e7e0d4"
    quiet-chapel: "#f6f6f8"
    surface: "#ffffff"
    surface-warm: "#f8f5ef"
    sacred-texture: "#faf9f6"
    ink-slate: "#1f2937"
    muted-slate: "#667085"
    border-slate: "#0f172a17"
    craft-brown: "#4A3728"
    destructive: "#b42318"
    success: "#167a45"
    warning: "#b54708"
    whatsapp: "#25D366"
typography:
    display:
        fontFamily: "Noto Serif, serif"
        fontSize: "2.25rem to 3.75rem"
        fontWeight: 700
        lineHeight: 1.1
        letterSpacing: "normal"
    headline:
        fontFamily: "Noto Serif, serif"
        fontSize: "1.875rem to 3rem"
        fontWeight: 700
        lineHeight: 1.15
        letterSpacing: "normal"
    title:
        fontFamily: "Noto Sans, sans-serif"
        fontSize: "1.125rem to 1.5rem"
        fontWeight: 700
        lineHeight: 1.25
        letterSpacing: "normal"
    body:
        fontFamily: "Noto Sans, sans-serif"
        fontSize: "1rem"
        fontWeight: 400
        lineHeight: 1.6
        letterSpacing: "normal"
    label:
        fontFamily: "Public Sans, Noto Sans, sans-serif"
        fontSize: "0.75rem"
        fontWeight: 700
        lineHeight: 1.2
        letterSpacing: "0.08em to 0.24em"
rounded:
    sm: "4px"
    md: "8px"
    lg: "12px"
    xl: "16px"
    modal: "32px"
    full: "9999px"
spacing:
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "32px"
    section: "80px to 96px"
components:
    button-primary:
        backgroundColor: "{colors.guadalupe-blue}"
        textColor: "{colors.surface}"
        rounded: "{rounded.md}"
        padding: "12px 16px"
    button-primary-large:
        backgroundColor: "{colors.guadalupe-blue}"
        textColor: "{colors.surface}"
        rounded: "{rounded.xl}"
        padding: "20px 40px"
    button-secondary:
        backgroundColor: "{colors.surface}"
        textColor: "{colors.guadalupe-blue}"
        rounded: "{rounded.md}"
        padding: "12px 16px"
    button-craft:
        backgroundColor: "{colors.craft-brown}"
        textColor: "{colors.surface}"
        rounded: "{rounded.sm}"
        padding: "8px 16px"
    input-default:
        backgroundColor: "{colors.surface}"
        textColor: "{colors.ink-slate}"
        rounded: "{rounded.md}"
        padding: "10px 12px"
    chip-selected:
        backgroundColor: "{colors.guadalupe-blue}"
        textColor: "{colors.surface}"
        rounded: "{rounded.md}"
        padding: "8px 16px"
    product-card:
        backgroundColor: "{colors.surface}"
        textColor: "{colors.ink-slate}"
        rounded: "{rounded.xl}"
        padding: "16px to 24px"
    dialog:
        backgroundColor: "{colors.surface-warm}"
        textColor: "{colors.ink-slate}"
        rounded: "{rounded.modal}"
        padding: "0px"
---

# Design System: Atelie Guadalupe

## 1. Overview

**Creative North Star: "The Devout Artisan and Healthcare Professional"**

Atelie Guadalupe should feel like a real workshop counter run by someone who knows the body, respects the customer, and makes products with faith and care. The public storefront carries the brand: it must explain natural tallow products plainly, show real product texture and craft, and help low-tech shoppers buy without friction.

The system combines devotional warmth with practical healthcare clarity. It avoids luxury boutique distance, generic marketplace patterns, dropshipping anonymity, and corporate polish with no founder story. Admin screens are allowed to be denser and quieter, but public pages should keep product purpose, ingredients, trust, and buying steps close to the surface.

**Key Characteristics:**

- Faith and craft are concrete: products, ingredients, founder story, testimonials, and service.
- Blue is the trust anchor; gold and warm surfaces support handmade and sacred cues.
- Typography pairs a serif brand voice with plain sans-serif UI labels and controls.
- Product imagery does real work and should not be replaced by decorative panels.
- Every important action uses direct labels suited to low-tech shoppers.

## 2. Colors

The palette is a restrained devotional storefront: a strong blue trust color, modest gold craft notes, soft warm surfaces, and slate text for legibility.

### Primary

- **Guadalupe Blue** (`#1940b3`): Primary actions, active navigation, focus emphasis, selected filters, and brand accents. Use it with restraint so it reads as guidance, not decoration.
- **Guadalupe Blue Ring** (`#1940b34d`): Focus rings and soft interaction glows around controls.

### Secondary

- **Gilded Craft** (`#d1a054`): Small sacred and artisanal cues, icon accents, craft details, and warm emphasis. Do not use as body text on light backgrounds without contrast checking.
- **Soft Relic** (`#e7e0d4`): Gentle background tint for devotional or handmade contexts.
- **Craft Brown** (`#4A3728`): Crafts catalog actions, craft product prices, and earthy handmade cues.

### Neutral

- **Quiet Chapel** (`#f6f6f8`): Main page background. It keeps pages bright without drifting into beige luxury.
- **Surface** (`#ffffff`): Cards, headers, dialogs, tables, and control surfaces.
- **Surface Warm** (`#f8f5ef`): Special dialogs and consultation surfaces where the brand needs a warmer tactile feel.
- **Sacred Texture** (`#faf9f6`): Rare textured backgrounds.
- **Ink Slate** (`#1f2937`): Primary body text and most UI text.
- **Muted Slate** (`#667085`): Secondary text. Avoid going lighter for body copy.
- **Border Slate** (`#0f172a17`): Default hairline border.

### State

- **Destructive** (`#b42318`): Delete, logout, and error states.
- **Success** (`#167a45`): Positive status and confirmation.
- **Warning** (`#b54708`): Risk, billing, stock, or attention states.
- **WhatsApp** (`#25D366`): WhatsApp consultation action only.

### Named Rules

**The Trust Anchor Rule.** Guadalupe Blue belongs on primary actions, active states, and trust cues. Do not spread it across every decorative element.

**The Warmth With Evidence Rule.** Warm surfaces support consultation, craft, and founder moments. They should be paired with concrete product or service content, not vague lifestyle copy.

## 3. Typography

**Display Font:** Noto Serif, with serif fallback  
**Body Font:** Noto Sans, with sans-serif fallback  
**Label Font:** Public Sans or Noto Sans, with sans-serif fallback

**Character:** Noto Serif gives the brand a devotional, handmade voice. Noto Sans and Public Sans keep shopping, admin, forms, and filters direct enough for low-tech customers.

### Hierarchy

- **Display** (`700`, `2.25rem to 3.75rem`, `1.1`): Home hero, major storefront headings, founder or product-purpose moments.
- **Headline** (`700`, `1.875rem to 3rem`, `1.15`): Section headings, collection titles, dialog titles, and important category pages.
- **Title** (`700`, `1.125rem to 1.5rem`, `1.25`): Product names, card headings, panel titles, and admin screen titles.
- **Body** (`400 to 500`, `1rem`, `1.6`): Product descriptions, instructional copy, dialog descriptions, and explanatory content. Keep long prose around 65 to 75 characters per line.
- **Label** (`700`, `0.6875rem to 0.75rem`, `0.08em to 0.24em`): Short badges, filters, table headers, status chips, and small metadata. Use uppercase only for short labels.

### Named Rules

**The Plain Purchase Rule.** Buttons, form labels, cart states, prices, and errors use sans-serif UI typography, not display typography.

**The No Mystery Copy Rule.** Headings may carry warmth, but buying labels must name the action: `Comprar`, `Adicionar ao carrinho`, `Abrir WhatsApp`, `Finalizar compra`.

## 4. Elevation

Elevation follows the **warm shop shelf** model. Public product cards and consultation surfaces can feel lightly lifted, like objects on a counter. Admin surfaces should stay flatter, using borders, white panels, and subtle tonal layers to keep work screens calm.

### Shadow Vocabulary

- **Shelf Lift** (`shadow-sm`, `shadow-lg`, or `shadow-primary/20`): Product cards, cart popovers, and primary storefront actions when lift supports purchase confidence.
- **Consultation Lift** (`0 18px 40px -20px rgba(37,211,102,0.95)`): WhatsApp consultation buttons only.
- **Dialog Lift** (`0 30px 80px -32px rgba(15,23,42,0.45)`): Large modals and immersive consultation dialogs.
- **Admin Layer** (`shadow-sm`): Tables, stat panels, and editor sections.

### Named Rules

**The Shelf Before Spotlight Rule.** Shadows should make products and decisions feel touchable. Avoid heavy ornamental shadows on inactive admin panels.

**The Border Or Shadow Rule.** If a component has a visible border, keep the shadow small. Do not pair hairline borders with wide decorative shadows on ordinary cards.

## 5. Components

### Buttons

- **Shape:** Storefront and admin buttons use `8px` to `12px` corners. Large consultation buttons use `12px` to feel more tactile. Pills are reserved for badges and counters.
- **Primary:** Guadalupe Blue background, white text, bold sans-serif label. Use for buying, saving, confirming, and selected navigation.
- **Craft Primary:** Craft Brown background, white text, compact padding. Use only in the crafts catalog and craft-specific actions.
- **Secondary:** White background with a slate or blue border, direct label, and hover tint.
- **Hover / Focus:** Use brightness or subtle background shifts. Focus uses the blue ring token and must remain visible.
- **Disabled / Loading:** Keep label space stable, lower opacity, and use explicit text like `Adicionando`.

### Chips

- **Style:** Rounded pills or compact rounded rectangles with high-contrast text.
- **Selected:** Guadalupe Blue or Craft Brown background with white text.
- **Unselected:** White or muted surface with slate text and light border.
- **Use:** Product line filters, status badges, category labels, and table states.

### Cards / Containers

- **Corner Style:** Public product cards and repeated storefront items use `12px` to `16px`. Profile legacy cards may use larger radii, but new cards should stay tighter unless the surface is explicitly soft and personal.
- **Background:** White on Quiet Chapel, or warm off-white for consultation dialogs.
- **Shadow Strategy:** Product cards may use Shelf Lift. Admin cards use `shadow-sm` or borders.
- **Border:** Use subtle slate borders for admin and utility panels. Storefront cards can omit borders when image and shadow already define the object.
- **Internal Padding:** `16px` to `24px` for cards, `24px` to `32px` for admin panels, `32px` to `48px` for major brand sections.

### Inputs / Fields

- **Style:** Rounded `8px` controls with white or slate-50 backgrounds, slate text, and clear placeholders.
- **Focus:** Blue ring or blue border plus ring. Do not remove outlines without replacing them.
- **Error / Disabled:** Error states use destructive red and helper text. Disabled states use reduced opacity plus disabled cursor.
- **Search:** Search inputs include a leading Material Symbol icon and stay compact.

### Navigation

- **Header:** Sticky, translucent Quiet Chapel or white surface, subtle bottom border, logo at left, collection links, search, cart, and user actions.
- **Active Links:** Bottom border in Guadalupe Blue or filled blue sidebar item in admin.
- **Admin Sidebar:** Dense, icon plus label, blue selected state, slate hover state.
- **Mobile:** Dialog-based admin menu and compact header actions. Labels should remain clear where icons are not universally understood.

### Dialogs

- **Standard Popovers:** White, `12px` radius, top-right anchored for cart and user menu.
- **Consultation Dialogs:** Warm surface, `32px` radius, immersive image panel, strong WhatsApp action.
- **Overlay:** Slate dark overlay at about 55 percent opacity.
- **Close Control:** Visible icon button at top edge, with hover feedback and accessible label.

### Product Media

- **Images:** Product images use square or `4:5` ratios, `object-cover`, and subtle hover scale.
- **Fallback:** Use the existing empty product asset. Do not replace missing product media with abstract decoration.
- **Badges:** Product line labels sit on image corners with white or blue-tinted backgrounds and short uppercase text.

## 6. Do's and Don'ts

### Do

- Use real product imagery, founder imagery, testimonials, and ingredient clarity to earn trust.
- Keep purchase paths plain: price, product name, product line, buy button, consultation fallback.
- Use Guadalupe Blue for primary action and active state consistency.
- Keep admin screens dense, predictable, and low-decoration.
- Check contrast whenever muted slate appears on tinted or image-backed surfaces.
- Use reduced-motion alternatives for any animation beyond simple hover transitions.

### Don't

- Do not make the storefront feel like generic ecommerce, a luxury boutique, dropshipping, or an anonymous corporate shop.
- Do not use decorative gradient text, heavy glass panels, side-stripe card accents, or repeated section eyebrows as a default scaffold.
- Do not hide buying actions behind ambiguous icons or clever labels.
- Do not use warm neutral backgrounds as a substitute for product story, product images, or founder context.
- Do not apply devotional language where the user needs concrete shopping information.
- Do not add new 32px-plus card radii except for immersive modals that already use that shape.
