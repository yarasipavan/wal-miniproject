//import modules

const expressAsyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const sequelize = require("../db/db.config");
//import models
const { Projects } = require("../models/projects.model");
const { ResourceRequests } = require("../models/resoure_request.model");
const { TeamMembers } = require("../models/team_members.model");
const { Employee } = require("../models/employee.model");
const { ProjectConcerns } = require("../models/project_concerns.model");
const { ProjectUpdates } = require("../models/project_updates.model");
const { User } = require("../models/user.model");
// functions

//check whether the project is exist in db with project id
let isProjectExist = async (project_id) => {
  let project = await Projects.findByPk(project_id);
  if (project) return true;
  else return false;
};

//controllers

// send all projects
exports.getAllProjects = expressAsyncHandler(async (req, res) => {
  let projects = await Projects.findAll({
    attributes: { exclude: ["domain", "type_of_project"] },
    order: [["project_id", "DESC"]],
  });
  // if no projects send not found
  if (!projects.length) {
    res.status(404).send({ alertMsg: "No project Found" });
  } else {
    res.send({ message: "All projects", payload: projects });
  }
});

// get all projects concerns
exports.getAllConcerns = expressAsyncHandler(async (req, res) => {
  let concerns = await ProjectConcerns.findAll({
    include: {
      model: Projects,
      attributes: [
        "project_name",
        "project_id",
        "project_manager_id",
        "gdo_head_id",
      ],
    },
    attributes: {
      exclude: ["project_id"],
    },
    order: [
      ["concern_raised_on", "DESC"],
      ["id", "DESC"],
    ],
  });
  // if no concerns send no concerns found
  if (!concerns.length) {
    res.status(404).send({ message: "No Concerns found" });
  }
  //esle send the concerns
  else {
    res.send({ message: "All concerns", payload: concerns });
  }
});

//add new project
exports.addProject = expressAsyncHandler(async (req, res) => {
  await Projects.create(req.body);
  res.status(201).send({ message: "Project Added Successfully" });
});

//update project details
exports.updateProjectDetails = expressAsyncHandler(async (req, res) => {
  //check the project is exist or not
  //if exist update project
  if (await isProjectExist(req.body.project_id)) {
    Projects.update(req.body, { where: { project_id: req.body.project_id } });
    res.send({ message: "Project details updated" });
  }
  //if project doest not exist
  else {
    res.status(404).send({
      alertMsg: `No project found with project id ${req.body.project_id}`,
    });
  }
});

//get all resource request
exports.getResourceRequests = expressAsyncHandler(async (req, res) => {
  let requests = await ResourceRequests.findAll({
    include: [
      {
        model: Projects,
        attributes: ["gdo_head_id", "project_name"],
      },
    ],
    order: [
      ["request_on", "desc"],
      ["request_id", "desc"],
    ],
  });
  if (requests.length) {
    res.send({ message: "All Resource Requests", payload: requests });
  }
});

//get detailed view
exports.getDetailedView = expressAsyncHandler(async (req, res) => {
  //get the project details of given project if exist along with related project updates, concerns and team composition
  let projectDetails = await Projects.findOne({
    where: {
      project_id: req.params.project_id,
    },
    include: [
      { model: TeamMembers, attributes: { exclude: ["project_id"] } },
      { model: ProjectConcerns, attributes: { exclude: ["project_id"] } },
      { model: ProjectUpdates, attributes: { exclude: ["project_id"] } },
    ],
  });
  // if project exists
  if (projectDetails) {
    //convert the projectDetails sequelize object to normal object
    projectDetails = projectDetails.toJSON();

    //calculate number concerns in raised state
    let concerns_count = 0;
    projectDetails.project_concerns.forEach((concern) => {
      if (concern.status.toLowerCase() === "raised") {
        concerns_count++;
      }
    });
    //calculate billed team count
    let team_billed_count = 0;
    projectDetails.team_members.forEach((team_member) => {
      if (team_member.billing_status.toLowerCase() === "billed")
        team_billed_count++;
    });
    projectDetails.concerns_count = concerns_count;
    projectDetails.team_billed_count = team_billed_count;
    //send onlyupdates of last 2 weeks
    // milliseconds for 2 weeks 1000*60*60*24*14=1209600000 milliseconds
    let latestUpdates = [];
    projectDetails.project_updates.forEach((project_update) => {
      if (project_update.date > new Date(Date.now() - 1209600000)) {
        latestUpdates.push(project_update);
      }
    });
    projectDetails.project_updates = latestUpdates;
    res.send({ message: "Project details", payload: projectDetails });
  } else {
    res.status(404).send({
      alertMsg: `No project found with project id ${req.params.project_id}`,
    });
  }
});

// get project by project Id
exports.getProject = expressAsyncHandler(async (req, res) => {
  let project = await Projects.findByPk(req.params.project_id);
  if (project) {
    //add team size to project object

    //get team size
    let team = await TeamMembers.findAll({
      attributes: ["resource_id"],
      where: {
        project_id: req.params.project_id,
      },
    });
    project = project.toJSON();
    project.team_size = team.length;

    res.send({ message: "Project Details", payload: project });
  } else {
    res.status(404).send({
      alertMsg: `No project found with project id ${req.params.project_id}`,
    });
  }
});

//get the team composition
exports.getTeam = expressAsyncHandler(async (req, res) => {
  if (await isProjectExist(req.params.project_id)) {
    let team = await TeamMembers.findAll({
      where: { project_id: req.params.project_id },
      include: {
        association: TeamMembers.Employee,
        attributes: { exclude: ["emp_id"] },
      },
      attributes: { exclude: ["project_id"] },
    });
    res.send({ message: "team composition", payload: team });
  } else {
    res.status(404).send({
      alertMsg: `No project found with project id ${req.params.project_id}`,
    });
  }
});

//get project updates
exports.getUpdates = expressAsyncHandler(async (req, res) => {
  // project exist the send the project updates
  if (await isProjectExist(req.params.project_id)) {
    //get the last two weeks updates
    let updates = await ProjectUpdates.findAll({
      where: {
        project_id: req.params.project_id,
        date: { [Op.gt]: new Date(Date.now() - 1209600000) },
      },
      order: [["date", "DESC"]],
    });
    // if updates exist send the updates
    if (updates.length) {
      res.send({ message: "All last two weeks updates", payload: updates });
    }
    // if updates not exist send no updates
    else {
      res.send({ alertMsg: "No project updates found" });
    }
  }
  //if project not exist then send not found
  else {
    res.status(404).send({
      alertMsg: `No project found with project id ${req.params.project_id}`,
    });
  }
});

// get project concerns
exports.getConcerns = expressAsyncHandler(async (req, res) => {
  // if project exist send the project concerns
  if (await isProjectExist(req.params.project_id)) {
    let concerns = await ProjectConcerns.findAll({
      where: {
        project_id: req.params.project_id,
      },
      order: [["concern_raised_on", "desc"]],
    });
    // if there are concerns , send all concerns
    if (concerns.length) {
      res.send({ message: "All concerns", payload: concerns });
    }
    // if no cercerns send same
    else {
      res
        .status(404)
        .send({ alertMsg: "No Concerns raised in this project till now" });
    }
  }
  // else send not found
  else {
    res.status(404).send({
      alertMsg: `No project found with project id ${req.params.project_id}`,
    });
  }
});

//get project managers
exports.getProjectManagers = expressAsyncHandler(async (req, res) => {
  let managers = await User.findAll({
    where: { user_type: "PROJECT-MANAGER", status: true },
    attributes: ["emp_id", "name"],
  });
  res.send({ message: "All Project Managers", payload: managers });
});

//get all gdo heads

exports.getAllGdos = expressAsyncHandler(async (req, res) => {
  let gdoHeads = await User.findAll({
    where: { user_type: "GDO-HEAD", status: true },
    attributes: ["emp_id", "name"],
  });
  res.send({ message: "All Project GDO Heads", payload: gdoHeads });
});

//get active client managers
exports.getAllEmployees = expressAsyncHandler(async (req, res) => {
  let employees = await Employee.findAll({
    where: {},
    attributes: ["emp_id", "name"],
  });
  res.send({ message: "All Employees", payload: employees });
});
