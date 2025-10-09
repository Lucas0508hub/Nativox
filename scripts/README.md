# AudioSeg User Management Scripts

This directory contains scripts to automate user creation and management for the AudioSeg application.

## Available Scripts

### 1. Create Single User (`create-user.ts`)

Creates a single user with custom email and password.

#### Usage:
```bash
# Basic usage (firstName and lastName are required)
npm run create-user -- user@example.com password123 John Doe

# With additional options
npm run create-user -- admin@company.com secretpass John Doe --role admin

# With custom username
npm run create-user -- editor@test.com password123 Jane Smith --username editor1 --role editor
```

#### Options:
- `--username <username>` - Custom username (default: email prefix)
- `--role <role>` - Role: admin, manager, editor (default: editor)
- `--inactive` - Create inactive user (default: active)
- `--help, -h` - Show help

#### Examples:
```bash
# Create an admin user
npm run create-user -- admin@company.com adminpass123 John Doe --role admin

# Create an editor with custom username
npm run create-user -- editor@company.com editorpass123 Jane Smith --username editor1 --role editor

# Create an inactive user
npm run create-user -- temp@company.com temppass123 Temp User --inactive
```

### 2. Batch User Creation (`create-users-batch.ts`)

Creates multiple users from a JSON file.

#### Usage:
```bash
npm run create-users-batch -- users.json
```

#### JSON File Format:
```json
[
  {
    "email": "user1@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "username": "user1",
    "role": "editor",
    "isActive": true
  },
  {
    "email": "admin@example.com",
    "password": "adminpass123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
]
```

#### Required Fields:
- `email` - User's email address
- `password` - User's password (minimum 6 characters)
- `firstName` - User's first name
- `lastName` - User's last name

#### Optional Fields:
- `username` - Custom username (default: email prefix)
- `role` - Role: admin, manager, editor (default: editor)
- `isActive` - Whether user is active (default: true)

#### Example JSON File:
See `users-example.json` for a complete example.

### 3. Create Default Users (`create-default-users.ts`)

Creates the default admin, manager, and editor users.

#### Usage:
```bash
npm run create-default-users
```

#### Default Users Created:
- **Admin**: admin / admin123
- **Manager**: manager / manager123  
- **Editor**: editor / editor123

## User Roles

### Admin
- Full system access
- Can manage all projects and users
- Can access all features

### Manager
- Can manage projects and folders
- Can assign tasks to editors
- Cannot manage users

### Editor
- Can transcribe and translate audio segments
- Can edit content within assigned projects
- Limited access to system settings

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change Default Passwords**: Always change default passwords after first login
2. **Strong Passwords**: Use strong passwords (minimum 6 characters, but recommend 12+)
3. **Email Validation**: Scripts validate email format automatically
4. **Unique Constraints**: Email and username must be unique
5. **Password Hashing**: All passwords are hashed with bcrypt (12 rounds)

## Error Handling

The scripts include comprehensive error handling:

- **Email Format Validation**: Ensures valid email addresses
- **Password Strength**: Minimum 6 characters required
- **Duplicate Prevention**: Checks for existing emails and usernames
- **Role Validation**: Ensures valid role assignments
- **Database Errors**: Graceful handling of database connection issues

## Examples

### Create a Team of Users

1. Create a JSON file with your team:
```json
[
  {
    "email": "john.manager@company.com",
    "password": "manager123456",
    "firstName": "John",
    "lastName": "Manager",
    "role": "manager"
  },
  {
    "email": "jane.editor@company.com",
    "password": "editor123456",
    "firstName": "Jane",
    "lastName": "Editor",
    "role": "editor"
  },
  {
    "email": "admin@company.com",
    "password": "admin123456",
    "firstName": "System",
    "lastName": "Admin",
    "role": "admin"
  }
]
```

2. Run the batch creation:
```bash
npm run create-users-batch -- team.json
```

### Quick Single User Creation

```bash
# Create a new editor
npm run create-user -- newuser@company.com password123 --first-name New --last-name User

# Create a new admin
npm run create-user -- newadmin@company.com adminpass123 --role admin --first-name New --last-name Admin
```

## Troubleshooting

### Common Issues:

1. **"User already exists"**: Email or username is already in use
2. **"Invalid email format"**: Check email address format
3. **"Password too short"**: Password must be at least 6 characters
4. **"Invalid role"**: Role must be admin, manager, or editor
5. **Database connection errors**: Check DATABASE_URL environment variable

### Getting Help:

Use the `--help` flag with any script:
```bash
npm run create-user -- --help
npm run create-users-batch -- --help
```
