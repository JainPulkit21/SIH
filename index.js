const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const dotenv = require("dotenv");
const authRoute = require("./routes/auth.js")
const fs = require("fs");
const path = require("path");


dotenv.config();




// Import the User model
const User = require("./models/userModel.js");
const say = require("say");

// Use body-parser middleware to parse JSON requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set("view engine", "ejs");
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

// Configure express-session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Middleware to check if the user is logged in
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/auth");
  }
}

// Use authRoute for authentication routes
app.use("/auth", authRoute);

// Modify the GET request to fetch all chat data from the database and render it
app.get("/", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId); // Fetch the user document by its ID
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    // Render the chat data from the user document
    res.render("home", { chats: user.chats });
  } catch (err) {
    console.error(`Error fetching user data: ${err}`);
    res.status(500).send("Internal server error");
  }
});

// Modify the POST request to add a new chat entry to the database
app.post("/", async (req, res) => {
  const { query } = req.body;


  try {
    const user = await User.findById(req.session.userId); // Fetch the user document by its ID
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    let query1 = query + "also give related links if available.Dont give links if you dont know the answer"

    // Execute your Python script here and replace this part with your actual logic
    const { exec } = require("child_process");
    exec(`python mineGpt.py "${query1}"`, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error}`);
        res.status(500).json({ error: "Internal server error" });
      } else {
        try {
          const outputJSON = JSON.parse(stdout);
          
          // Add a new chat object to the user's chats array
          user.chats.push({ query, answer: outputJSON });
          
          // Save the updated user document to the database
           await user.save();
            say.speak(outputJSON,"Alex","1.25");
          // Redirect to the homepage
          res.redirect("/");
        } catch (e) {
          console.error(`Error parsing Python script output: ${e}`);
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });
  } catch (err) {
    console.error(`Error adding a new chat: ${err}`);
    res.status(500).send("Internal server error");
  }
});

app.get("/update",async(req,res)=>{
  res.render("update");
})

app.post('/update', (req, res) => {
  const { Act, description } = req.body;

  if (!Act || !description) {
    return res.status(400).send('Both Act and description are required.');
  }

  // Create a string with the data to be appended to data.txt
  const dataToAppend = `Act: ${Act}, Description: ${description}\n`;

  // Append the data to data.txt
  fs.appendFile('data.txt', dataToAppend, (err) => {
    if (err) {
      console.error('Error appending data:', err);
      return res.status(500).send('Error updating data.');
    }

    console.log('Data appended successfully.');
    res.status(200).send('Data appended successfully.');
  });
});


app.get("/about",requireLogin,(req,res)=>{
  res.render("about");
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
