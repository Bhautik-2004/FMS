# Financial Management System

A modern financial management dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** with strict mode enabled
- **Tailwind CSS** with custom financial dashboard color palette
- **Path Aliases** (@/ for src directory)
- **ESLint & Prettier** configured
- **Custom Color Palette** optimized for financial data visualization

## 📊 Color Palette

The project includes a custom color palette designed specifically for financial dashboards:

- **Primary Blues**: Main theme colors for UI elements
- **Positive Greens**: Representing profit, growth, and positive trends
- **Negative Reds**: Representing losses, decline, and negative trends
- **Neutral Grays**: For backgrounds, borders, and text

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, pnpm, or bun

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Building for Production

```bash
npm run build
npm start
```

### Code Formatting

Format your code with Prettier:

```bash
npm run format
```

### Linting

Run ESLint:

```bash
npm run lint
```

## 📁 Project Structure

```
FMS-Main/
├── src/
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
├── .github/
│   └── copilot-instructions.md
├── .eslintrc.json
├── .prettierrc.json
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🎨 Using the Custom Colors

The custom color palette is available throughout your Tailwind classes:

```tsx
// Primary blues
<div className="bg-primary-600 text-white">Primary</div>

// Positive values (green)
<span className="text-positive-600">+15.5%</span>

// Negative values (red)
<span className="text-negative-600">-8.2%</span>

// Neutral grays
<div className="bg-neutral-100 text-neutral-900">Content</div>
```

## 📝 Configuration

### TypeScript

The project uses TypeScript with strict mode enabled. Configuration is in `tsconfig.json`.

### Path Aliases

Import from `src` directory using `@/` prefix:

```typescript
import { Component } from "@/components/Component";
```

### Tailwind CSS

Custom colors and configuration are defined in `tailwind.config.ts`.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is licensed under the MIT License.
