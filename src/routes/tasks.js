const {Router} = require('express')
const Tasks = require("../models/tasks");
const auth = require('../middlewares/auth')
const router = Router()

router.post("/tasks", auth, async (req, res) => {
  const task = new Tasks({
    ...req.body,
    owner: req.user._id
  });

  try {
    await task.save();
    res.send(task);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get("/tasks", auth, async (req, res) => {
  const match = {}
  const sort = {}
  if (req.query.completed){
    match.completed = req.query.completed === 'true'
  }
  if (req.query.sort){
    const part = req.query.sort.split(':')  
    sort[part[0]] = part[1] === 'desc' ? -1 : 1
  }
  try {
    await req.user.populate({
      path: 'tasks', 
      match,
      options: {
        limit: +req.query.limit,
        skip: +req.query.skip,
        sort,
      }
    }).execPopulate()
    res.send(req.user.tasks);
  } catch (e) {
    console.log(e)
    res.status(500).send();
  }
});

router.get("/tasks/:id", auth, async (req, res) => {
  const _id = req.params.id;

  try {
   
    const task = await Tasks.findOne({_id, owner: req.user._id})
    if (!task) {
      return res.status(404).send();
    }
    res.send(task);
  } catch (e) {
    res.status(500).send();
  }
});

router.patch("/tasks/:id", auth, async (req, res) => {
  const _id = req.params.id;
  const updateFields = ["description", "completed"];
  const fieldsOnReq = Object.keys(req.body);
  const isValidOperation = fieldsOnReq.every((field) =>
    updateFields.includes(field)
  );

  if (!isValidOperation) {
    return res.status(400).send("Cant Update unknown Field");
  }

  try {
    // const updatedTask = await Tasks.findByIdAndUpdate(_id, req.body, {
    //   new: true,
    //   runValidators: true,
    // });

    // await updatedTask.save()
    
    const updatedTask = await Tasks.findOne({_id, owner: req.user._id})

    if (!updatedTask) {
      return res.status(404).send();
    }

    fieldsOnReq.forEach(field => updatedTask[field] = req.body[field])

    await updatedTask.save()

    res.send(updatedTask);
  } catch (e) {
    console.log(e)
    res.status(400).send(e);
  }
});

router.delete("/tasks/:id",auth, async (req, res) => {
  const _id = req.params.id;
  try {
    const user = await Tasks.findOneAndDelete({_id, owner: req.user._id});
    if (!user) {
      return res.status(404).send();
    }
    res.send(user);
  } catch (e) {
    console.log(e)
    res.status(500).send();
  }
});


module.exports = router