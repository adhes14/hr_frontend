---
description: Automatically push local changes and create a structured Pull Request on GitHub.
---

This workflow automates the process of pushing changes to a remote repository and opening a new Pull Request with a professional title and detailed description based on the commit history.

### Prerequisites
- The `github-mcp-server` must be configured and authenticated.
- The user must have a local branch (e.g., `dev`) ahead of its remote counterpart.

### Steps

#### 1. Analyze Local Git State
- Determine the current branch name (`head`).
- Identify the target branch (usually `main`).
- Check if the local branch is ahead of the remote (`git status`).
- **Verify Repository Context**: Explicitly check the repository name and confirm that all analyzed changes and conversation history refer *exclusively* to this project. Avoid including information from recent sessions of other projects.

#### 2. Push Changes to Remote
// turbo-all
- Push the local commits to the remote repository.
```bash
git push origin [current-branch]
```

#### 3. Generate PR Content
- Run `git log origin/[base-branch]..[head-branch] --oneline` to see the changes.
- **Validate Commit Intent**: Cross-reference the commit messages with the actual file diffs to ensure the PR accurately reflects work done *within this project's stack* (e.g., avoiding mentions of Firebase if it's not present).
- Based on the commit messages, generate:
  - A short, descriptive **Title** in English.
  - A **Detailed Description** in English following GitHub best practices (Overview, Key Changes, Technical Notes).

#### 4. Create the Pull Request
// turbo-all
- Call the `mcp_github-mcp-server_create_pull_request` tool with:
  - `owner`: [owner]
  - `repo`: [repo]
  - `title`: [generated-title]
  - `body`: [generated-description]
  - `head`: [head-branch]
  - `base`: [base-branch]

#### 5. Verify PR Creation
- Return the PR URL to the user and ask if any further steps (like labels or assignees) are needed.
