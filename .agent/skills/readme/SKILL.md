---
name: readme
description: A specialist skill for generating and maintaining professional, standardized README.md files for web application projects based on actual codebase analysis.
---

# README Skill

A skill for generating professional, feature-rich `README.md` files for web application projects based on actual codebase analysis.

## Key Instructions

1.  **Codebase Scan**: Before generating a README, use `list_dir` and `view_file` on `package.json`, `src/app.module.ts`, and `src/` to identify the project's purpose, core features, and architectural design patterns.
2.  **Section Management**:
    *   **Header**: Include a catchy project title and a value-driven description.
    *   **Features**: Highlight key modules (Auth, CRUD, Reports, etc.) found in the source.
    *   **Tech Stack**: Detailed list with links to the main dependencies (e.g., NestJS, TypeORM, PostgreSQL, Passport).
    *   **Architecture**: Explain the layered design (Controllers, Services, Repositories).
    *   **Project Structure**: Table mapping directories to their functional roles.
    *   **Getting Started**: Comprehensive prerequisites, installation steps, and environment variable documentation.
3.  **Visuals**: Recommend placeholders for logos and screenshots.
4.  **Formatting**: Ensure standard Markdown with readable headings and code blocks.
5.  **Branding**: End with an author credits line linking to their GitHub profile.

## Resources

-   `resources/template.md`: A standard Markdown template that can be used for scaffolding.
