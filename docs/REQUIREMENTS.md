# Productivity App - Product & Technical Specification v1

## Vision

Build a lightweight, local-first productivity application focused on writing, organizing information, and managing simple task lists.

The application should feel like a modern notepad rather than a complex productivity platform.

Primary goals:

* Fast
* Simple
* Offline-first
* Cross-platform
* User-owned data
* Minimal cognitive load

The application should avoid the complexity of Notion, ClickUp, Jira, Obsidian plugins, or enterprise productivity suites.

---

# Core Philosophy

The user should be able to:

1. Open the application.
2. Select a project.
3. Start writing immediately.
4. Close the application.

No setup.
No configuration.
No friction.

The application should prioritize writing and organization over features.

---

# Target Platforms

Initial release:

* Windows
* Android

Future:

* Linux
* macOS
* iOS

---

# Technology Stack

## Frontend

* React
* TypeScript

## Runtime

* Tauri 2

## Database

* SQLite

## Editor

* Tiptap

## Native Layer

* Rust

Rust responsibilities:

* SQLite access
* Filesystem operations
* Backup system
* Future sync engine
* Future encryption

React responsibilities:

* User Interface
* Editor
* Navigation
* Application state
* Search UI

---

# Information Architecture

The application organizes information using a simple hierarchy.

Project
└── Section
└── Page

Example:

Slorvax
├── Ideas
├── TODO
├── Technical Notes
└── References

Client System
├── Requirements
├── Architecture
└── Pending Tasks

---

# User Interface

## Layout

Three-column structure.

### Left Sidebar

Contains:

Projects

Inside each project:

Sections

Features:

* Create project
* Rename project
* Delete project
* Reorder projects
* Create section
* Rename section
* Delete section
* Reorder sections

Drag and drop required.

---

### Main Content Area

Displays the selected page.

Editor should occupy most of the available space.

Writing must be the primary focus.

No visual clutter.

---

### Optional Right Panel (Future)

Potential future use:

* Tags
* Metadata
* Search results
* Backlinks

Not part of V1.

---

# Editor Requirements

## Supported Content

### Text

* Paragraphs
* Bold
* Italic
* Underline
* Strikethrough
* Headings

### Lists

* Bullet lists
* Ordered lists

### Tasks

* Checkboxes
* Nested checkboxes
* Drag-and-drop reordering

### Code Blocks

Optional but desirable.

Useful for developers.

### Images

Not required for V1.

Future support:

* Paste image
* Drag image
* Store locally
* Sync later

---

# User Experience

## Writing First

The editor should always be immediately available.

The application should never force the user through dialogs before writing.

---

## Minimal Clicks

Creating a note should take no more than:

* One click
  or
* One keyboard shortcut

---

## Fast Navigation

The user should be able to navigate the entire application without touching the mouse.

---

## Command Palette

Required.

Shortcut:

Ctrl + K

Capabilities:

* Search pages
* Search projects
* Create page
* Create project
* Navigate anywhere

Inspired by:

* VSCode
* Obsidian
* Linear

---

## Quick Capture

Required.

Shortcut:

Ctrl + N

Creates a new page instantly.

Cursor immediately focused.

User can begin typing without additional interaction.

---

## Keyboard Shortcuts

Required:

Ctrl + N → New Page

Ctrl + K → Command Palette

Ctrl + S → Save (even if autosave exists)

Ctrl + F → Search Current Page

Ctrl + Shift + F → Global Search

---

## Autosave

Required.

Changes should save automatically.

No save dialogs.

No risk of losing data.

---

# Search

Global search across:

* Projects
* Sections
* Pages
* Page content

Requirements:

* Instant
* Local
* Offline

Future:

* Fuzzy search
* Ranking
* Recent items

---

# Data Model

## projects

* id (UUID)
* name
* sort_order
* created_at
* updated_at
* deleted_at

## sections

* id (UUID)
* project_id
* name
* sort_order
* created_at
* updated_at
* deleted_at

## pages

* id (UUID)
* section_id
* title
* content_json
* sort_order
* created_at
* updated_at
* deleted_at

---

# Content Storage

Do not store HTML.

Store editor data using Tiptap JSON format.

Benefits:

* Better synchronization
* Easier migrations
* Structured data
* Long-term maintainability

---

# UUID Strategy

All entities must use UUIDs.

No auto-increment IDs.

Reason:

Future synchronization support.

---

# Deletion Strategy

Use soft deletes.

Never immediately remove records.

Use:

deleted_at

Reason:

Future synchronization support.

---

# Local-First Architecture

SQLite is the source of truth.

Application must function without internet.

Internet connectivity should never be required.

---

# Backup System

V1 Requirements:

* Export backup
* Import backup

Preferred format:

Single SQLite backup file

Example:

productivity-backup.db

Future:

* Scheduled backups
* Versioned backups

---

# Synchronization Roadmap

Not implemented in V1.

Architecture must allow future implementation.

Potential providers:

* Google Drive
* OneDrive
* Dropbox
* WebDAV
* Custom Sync Server

Requirements:

* Local-first
* Sync optional
* Sync independent from UI
* Conflict support possible later

The application must continue functioning if synchronization fails.

---

# Visual Design Principles

The application should feel:

* Calm
* Clean
* Fast
* Focused

Avoid:

* Excessive animations
* Visual noise
* Complex dashboards
* Corporate admin aesthetics

Inspiration:

* Bear
* Craft
* Obsidian (without plugin overload)
* Apple Notes
* Linear

Not inspiration:

* Jira
* ClickUp
* Monday
* Salesforce

---

# Performance Requirements

Startup:

< 2 seconds

Project switching:

Instant

Page switching:

Instant

Typing latency:

Imperceptible

Target scale:

* Thousands of pages
* Hundreds of projects
* Large text documents

---

# Future Features (Not V1)

Potential roadmap:

* Image support
* Tags
* Favorites
* Pinned pages
* Recent pages
* Daily notes
* Templates
* Markdown import/export
* Google Drive sync
* Mobile widgets
* Encryption
* Cross-device sync

---

# Explicit Non-Goals

Do not build:

* Team collaboration
* User accounts
* Permissions
* Realtime collaboration
* Kanban boards
* CRM features
* Databases
* Automation workflows
* AI features
* Enterprise functionality

These can be evaluated later if the product succeeds.

The first version must remain extremely focused.

---

# Final Principle

Every new feature must answer:

"Does this make writing and organizing information faster?"

If the answer is no, it should not be included.
