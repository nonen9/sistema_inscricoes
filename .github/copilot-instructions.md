# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a tournament registration system built with Node.js and Express. The system allows:

1. **Admin Management**: Create tournaments with categories, dates, locations, pricing
2. **Public Registration**: Allow users to register for tournaments based on categories
3. **Category Types**:
   - X1: Single player registration
   - X2: Double player registration (duo)
   - Misto: Mixed double player registration (duo)

## Key Features
- Tournament creation with customizable categories
- Dynamic registration forms based on category selection
- Maximum registration limits per category
- Webhook integration for completed registrations
- Simple file-based data storage using JSON

## Architecture
- Backend: Express.js server
- Frontend: Vanilla HTML/CSS/JavaScript
- Data Storage: JSON files
- API endpoints for admin and registration functionality

## Code Style Guidelines
- Use ES6+ JavaScript features
- Follow RESTful API conventions
- Implement proper error handling
- Use descriptive variable and function names
- Add comments for complex business logic
