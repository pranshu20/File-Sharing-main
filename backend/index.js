const { render } = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const multer = require("multer");
const app = express();
const ejsMate = require("ejs-mate");
const User = require("./models/user");
const path = require("path");
const fs = require("fs");

const bodyParser = require("body-parser");
var imageModel = require("./models/image");
const File = require("./models/file");

require("dotenv").config();
app.use(express.json());
const cookieSession = require("cookie-session");
const { findById, findOneAndUpdate } = require("./models/user");
require("../passport-setup");

app.use(express.urlencoded({ extended: true }));
app.set("views", path.join(__dirname, "/views"));

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.use("/assets", express.static(__dirname + "/assets"));
app.use(
  cookieSession({
    name: "tuto-session",
    keys: ["key1", "key2"],
  })
);

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("⚛︎⚛︎ Connected to mongoDB.");
  } catch (error) {
    console.log(error);
    console.log("Error connecting to mongoDB.");
  }
};
connect();

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + "/upload/users");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const uploadfile = multer({ storage: storage });
app.post("/uploadfile/:id", uploadfile.single("myImage"), async (req, res) => {
  const f = new File({ path: req.file.path, name: req.file.originalname });
  await f.save();
  const b = f.id;
  const user = User.findById(req.params.id).then(async (data) => {
    data.MyFiles.push(b);
    data.save();
  });
  var img = fs.readFileSync(req.file.path);
  var encode_img = img.toString("base64");
  var final_img = {
    contentType: req.file.mimetype,
    image: new Buffer.from(encode_img, "base64"),
  };
  imageModel.create(final_img, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      res.render("pages/endgame");
    }
  });
});

mongoose.connection.on("disconnected", () => {
  console.log("mongoDB disconnected!");
});

const isLoggedIn = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.sendStatus(401);
  }
};

// Initializes passport and passport sessions
app.use(passport.initialize());
app.use(passport.session());

// Example protected and unprotected routes
app.get("/", (req, res) => res.render("pages/index"));
app.get("/failed", (req, res) => res.send("You Failed to log in!"));

// In this route you can see that if the user is logged in u can acess his info in: req.user
app.get("/good", isLoggedIn, async (req, res) => {
  User.find({ email: req.user.email }).then(async (data) => {
    if (data.length === 0) {
      const us = new User({
        email: req.user.email,
        name: req.user.displayName,
      });
      await us.save();
      const fileName = [];
      const files = us.MyFiles;
      for (let file of files) {
        await File.findById(file).then((data) => {
          fileName.push(data.name);
        });
      }
      res.render("pages/main", {
        name: req.user.displayName,
        pic: req.user.photos[0].value,
        email: req.user.email,
        object: us.id,
        file: us.MyFiles,
        fileName,
      });
    } else {
      const fileName = [];
      //console.log(data[0]);
      const files = data[0].MyFiles;
      for (let file of files) {
        await File.findById(file).then((data) => {
          fileName.push(data.name);
        });
      }
      res.render("pages/main", {
        name: req.user.displayName,
        pic: req.user.photos[0].value,
        email: req.user.emails[0].value,
        object: data[0].id,
        file: data[0].MyFiles,
        fileName,
      });
    }
  });
});

// Auth Routes
app.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/failed" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/good");
  }
);

app.get("/uploader/:id", (req, res) => {
  const ObjectId = req.params.id;
  console.log(ObjectId);
  res.render("pages/upload", { ObjectId });
});

app.get("/show/:id", (req, res) => {
  const ob = req.params.id;
  File.findById(ob).then((data) => {
    //console.log(data);
    var img = fs.readFileSync(data.path);
    var encode_img = img.toString("base64");
    var final_img = {
      contentType: "image/jpeg",
      image: new Buffer.from(encode_img, "base64"),
    };
    res.contentType(final_img.contentType);
    res.send(final_img.image);
  });
});

app.get("/:userID/share/:id", (req, res) => {
  const id = req.params.id;
  const userid = req.params.userID;
  res.render("send", { id, userid });
});

app.post("/:userId/recieve/:id", (req, res) => {
  const id = req.params.id;
  const userid = req.body.email;
  //console.log(id);
  User.find({ email: userid }).then(async (data) => {
    //console.log(data);
    if (data.length === 0) {
      const r = new User({ email: userid });
      r.save();
      r.shared.push(id);
      //console.log(r);
    } else {
      //const a={email:userid};
      //const b={};
      await User.findOneAndUpdate({ email: userid }, { $push: { shared: id } });
    }
  });
  res.redirect("/good");
});

app.use("/recieved/:id", (req, res) => {
  const id = req.params.id;
  const fname = [];
  User.findById(id).then(async (data) => {
    const sh = data.shared;
    //console.log(sh);
    for (let fil of sh) {
      await File.findById(fil).then(async (data) => {
        //console.log(data.name);
        fname.push(data.name);
      });
    }
    res.render("recieved", {
      fname,
      file: sh,
    });
  });
});

app.use("/showRecieve/:id", (req, res) => {
  const ob = req.params.id;
  File.findById(ob).then((data) => {
    //console.log(data);
    var img = fs.readFileSync(data.path);
    var encode_img = img.toString("base64");
    var final_img = {
      contentType: "image/jpeg",
      image: new Buffer.from(encode_img, "base64"),
    };
    res.contentType(final_img.contentType);
    res.send(final_img.image);
  });
});
app.get("/logout", (req, res) => {
  req.session = null;
  req.logout();
  res.redirect("/");
});

//listening on port

app.listen(3000, () => {
  console.log("🚀 Server started on port 3000");
});
