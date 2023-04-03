//create mini express app
const express = require("express");
const router = express.Router();
//import middlewares
let verifySuperAdmin = require("../middlewares/verifySuperAdmin");

//body-parser
router.use(express.json());

//import controllers / req handlers
let {
  setRoleByempId,
  deleteUser,
  updateUser,
  getUsers,
  getActiveUsers,
} = require("../controllers/super-admin-controller");
const { route } = require("./public_routes");

//routes

//role mapping
router.post("/role-mapping/employee/:emp_id", verifySuperAdmin, setRoleByempId);

// update user
router.put("/employee/:emp_id", verifySuperAdmin, updateUser);

//delete user
router.delete("/employee/:emp_id", verifySuperAdmin, deleteUser);

//get all users
router.get("/users", verifySuperAdmin, getUsers);

//get Active users

router.get("/active-users", verifySuperAdmin, getActiveUsers);

//export router
module.exports = router;
