# 🚀 Quick Start Guide for Team Members

## ✅ Setup Complete!

Your disaster management platform is now configured with:

- ✅ React 19 with React Router
- ✅ Tailwind CSS for styling
- ✅ React Hook Form for forms
- ✅ Zustand for state management
- ✅ Axios for API calls
- ✅ All 8 module pages created

## 🖥️ Your Application is Running

**Development Server:** http://localhost:5174/

The application includes:

1. **Dashboard** - Overview of all modules
2. **Missing Persons** - Report missing people
3. **Disaster Reports** - Submit disasters
4. **Animal Rescue** - Report animals needing help
5. **Camp Management** - Manage relief camps
6. **Volunteers** - Register volunteers
7. **Donations** - Facilitate donations
8. **Emergency Contacts** - Quick access to services

## 📝 What Each Team Member Should Do Next

### Person 1: Missing Persons & Disaster Reports

1. Open `src/pages/MissingPersons.jsx`
2. Create a form using React Hook Form:
   - Name, Age, Last Seen Location, Date, Photo Upload
   - Phone Contact, Description
3. Open `src/pages/DisasterReports.jsx`
4. Create disaster form:
   - Type (Flood, Landslide, Fire, etc.)
   - Location, Severity, Description, Photos

**Example Form Template:**

```jsx
import { useForm } from "react-hook-form";

function MissingPersons() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    console.log(data);
    // Later: Call API to save
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Report Missing Person</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card max-w-2xl">
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Full Name *
          </label>
          <input
            {...register("name", { required: "Name is required" })}
            className="input-field"
            placeholder="Enter full name"
          />
          {errors.name && (
            <span className="text-red-500 text-sm">{errors.name.message}</span>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            Age *
          </label>
          <input
            type="number"
            {...register("age", { required: "Age is required", min: 0 })}
            className="input-field"
            placeholder="Enter age"
          />
          {errors.age && (
            <span className="text-red-500 text-sm">{errors.age.message}</span>
          )}
        </div>

        {/* Add more fields */}

        <button type="submit" className="btn-primary w-full">
          Submit Report
        </button>
      </form>
    </div>
  );
}
```

### Person 2: Animal Rescue, Volunteers & Donations

1. Open `src/pages/AnimalRescue.jsx`
   - Animal type, Location, Condition, Photo
2. Open `src/pages/Volunteers.jsx`
   - Name, Skills, Availability, Contact
3. Open `src/pages/Donations.jsx`
   - Donation type (Money/Items), Amount, Payment method

### Person 3: Camp Management & Backend

1. Open `src/pages/CampManagement.jsx`
   - Camp name, Location, Capacity
   - Resources needed (Food, Water, Medicine)
   - Current occupancy
2. Set up backend:
   - Choose: Firebase (easiest) or Node.js + Express
   - Create database schema
   - Build API endpoints

## 🎨 Using Tailwind CSS

### Common Classes You'll Use

```jsx
// Containers
<div className="container mx-auto px-4 py-8">

// Cards
<div className="card">

// Buttons
<button className="btn-primary">Submit</button>
<button className="btn-danger">Delete</button>

// Inputs
<input className="input-field" />

// Grid Layouts
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// Spacing
className="mb-4"  // margin-bottom: 1rem
className="mt-6"  // margin-top: 1.5rem
className="p-4"   // padding: 1rem

// Text
className="text-lg font-semibold text-gray-700"
```

## 📦 Using Zustand (State Management)

**When to use:**

- Store form data temporarily
- Share data between pages
- Keep user session info

**Example:**

```jsx
import { useMissingPersonStore } from "../store";

function MyComponent() {
  const { missingPersons, addMissingPerson } = useMissingPersonStore();

  const handleSubmit = (data) => {
    addMissingPerson({
      id: Date.now(),
      ...data,
      createdAt: new Date().toISOString(),
    });
  };
}
```

## 🔌 Making API Calls

**When you have a backend:**

```jsx
import { missingPersonsAPI } from "../services/api";

async function submitReport(data) {
  try {
    const response = await missingPersonsAPI.create(data);
    alert("Report submitted successfully!");
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to submit report");
  }
}
```

## 🎯 Development Workflow

1. **Pull latest code**

   ```bash
   git pull origin main
   ```

2. **Create your feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test**

   - Edit files
   - Check http://localhost:5174
   - Test your forms

4. **Commit your work**

   ```bash
   git add .
   git commit -m "Add missing person form"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub
   - Create PR from your branch to main
   - Ask teammate to review

## 🐛 Common Issues & Solutions

### Issue: Tailwind classes not working

**Solution:** Make sure dev server is running, restart it if needed

### Issue: Form not submitting

**Solution:** Check console for errors (F12 in browser)

### Issue: Port already in use

**Solution:** Vite will automatically use next port (5174, 5175, etc.)

### Issue: Can't see changes

**Solution:** Hard refresh browser (Ctrl + Shift + R)

## 📚 Learning Resources

**React Basics (30 min):**

- https://react.dev/learn - Official React tutorial

**Forms (20 min):**

- https://react-hook-form.com/get-started - Quick start guide

**Tailwind (15 min):**

- https://tailwindcss.com/docs/utility-first - Core concepts

**Video Tutorials:**

- "React in 100 Seconds" - https://youtu.be/Tn6-PIqc4UM
- "React Hook Form Tutorial" - https://youtu.be/RkXv4AXXC_4

## 🆘 Need Help?

1. **Check the docs** - Look at README.md
2. **Search error message** - Google the exact error
3. **Ask your teammates** - They might have solved it
4. **Check Console** - Press F12 in browser to see errors

## ✨ Tips for Success

1. **Start small** - Get one form working first
2. **Test frequently** - Check after each change
3. **Use components** - Don't repeat code
4. **Commit often** - Save your progress
5. **Ask questions** - Don't stay stuck for hours

---

## 🎉 Ready to Code!

Start with your assigned module and build one feature at a time. You've got this! 💪

**Next Step:** Choose which module you want to work on first and start building the form.
