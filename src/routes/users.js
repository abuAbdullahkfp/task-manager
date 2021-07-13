const {Router} = require('express')
const router = Router()
const User = require("../models/users");
const auth = require("../middlewares/auth");
const multer = require('multer')  
const sharp =  require('sharp')
const {sendWelcomeEmail, sendRemoveEmail} = require('../emails/account')
const uploads = multer({
  limits: {
    fileSize: 1000000
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)){
      return cb(new Error('Please Provide a Valid file type'))
    }
    cb(undefined, true)
  }
})

router.post("/users", async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    sendWelcomeEmail(user.email, user.name);
    const token = await user.getAuthToken()
    res.status(201).send({user, token});
  } catch (e) {
    console.log(e)
    res.status(400).send(e);
  }
});

router.post("/users/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findByCredentials(email, password);
    const token = await user.getAuthToken();
    res.send({ user, token });
  } catch (e) {
    console.log(e);
    res.status(400).send();
  }
});


router.get("/users/me",auth, async (req, res) => {
  try {
    res.send(req.user)
  } catch (e) {
    res.status(500).send(e);
  }
});


router.patch("/users/me", auth ,async (req, res) => {
  const allowedUpdates = ["name", "email", "password", "age"];
  const updateFields = Object.keys(req.body);
  const isExist = updateFields.every((field) => allowedUpdates.includes(field));

  if (!isExist) {
    return res.status(400).send();
  }

  try {
    // const patchUser = await User.findByIdAndUpdate(_id, req.body, {
    //   new: true,
    //   runValidators: true,
    // });
    
    const user = req.user

    updateFields.forEach((field) => user[field] = req.body[field])

    await user.save()

    res.send(user);

  } catch (e) {
    res.status(400).send(e);
  }
});

router.post('/users/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token)
    await req.user.save()
    res.send()
  } catch (e) {
    res.status(500).send()
  }
})

router.post('/users/logoutAll', auth, async(req, res) => {
  try {
    req.user.tokens = []
    await req.user.save()
    res.send()
  } catch (e) {
    res.status(500).send()
  }

})

router.delete('/users/me', auth, async (req, res) => {
  try {
    await req.user.remove()
    sendRemoveEmail(req.user.email, req.user.name);
    res.send(req.user)
  } catch (e) {
    req.status(500).send()
  }
})

router.post('/users/me/avatar', auth,uploads.single('avatar'), async(req, res) => {
  const buffer = await sharp(req.file.buffer).resize({width:250, height:250}).png().toBuffer()
  req.user.avatar = buffer
  await req.user.save()
  res.send()
},

(error, req, res, next) => {
  res.status(400).send({ error: error.message });
}
)

router.delete('/users/me/avatar', auth, async(req, res) => {
  req.user.avatar = undefined
  await req.user.save()
  res.send()
})

router.get('/users/:id/avatar', async(req, res) => {
  const _id = req.params.id
  const user = await User.findById(_id)

  try {
    if (!user || !user.avatar) {
      throw new Error()
    }
    res.set('Content-Type', 'image/jpg')
    res.send(user.avatar) 
  } catch (e) {
    res.status(404).send()
  }

})

module.exports = router