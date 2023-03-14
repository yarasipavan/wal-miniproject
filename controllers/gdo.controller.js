// import modules
const expressAsyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
//import model
const { Projects } = require("../models/projects.model");
const { ResourceRequests } = require("../models/resoure_request.model");
const { TeamMembers } = require("../models/team_members.model");
const { Employee } = require("../models/employee.model");
const { ProjectConcerns } = require("../models/project_concerns.model");
const { ProjectUpdates } = require("../models/project_updates.model");

//functions

//function to know whether the project is under gdo head or not
let isProjectUnderGdo = async (project_id, gdo_head_id) => {
  let project = await Projects.findOne({
    where: {
      project_id: project_id,
      gdo_head_id: gdo_head_id,
    },
  });
  if (project) return project;
  else return false;
};

//controllers

//add new projects
// exports.addProject = expressAsyncHandler(async (req, res) => {
//   await Projects.create(req.body, { include: TeamMembers });
//   res.send({ message: "Project Added Successfully" });
// });

// //update project
// exports.updateProject = expressAsyncHandler(async (req, res) => {
//   //check the modifying project is exist under logged in gdo head or not
//   let project = await Projects.findAll({
//     where: {
//       project_id: req.body.project_id,
//       gdo_head_id: req.user.emp_id,
//     },
//   });
//   //if exist modify
//   if (project) {
//     let updates = await Projects.update(req.body, {
//       where: { project_id: req.body.project_id },
//     });

//     if (updates[0]) {
//       res.send({ message: "Project Details modified successfully" });
//     } else {
//       res.send({ alertMsg: "No modifications Done" });
//     }
//   }
//   // else send not found
//   else {
//     res.status(404).send({
//       alertMsg: `No project found under you with project id ${req.body.project_id} to update`,
//     });
//   }
// });

//get the projects
exports.getProjects = expressAsyncHandler(async (req, res) => {
  //we have logged in user details in req by the action in verifyGdoHead,, so get the projects under logged in GDO Head
  let projects = await Projects.findAll({
    where: { gdo_head_id: req.user.emp_id },
    attributes: { exclude: ["domain", "type_of_project", "gdo_head_id"] },
  });
  //projects exist send projects
  if (projects.length) {
    res.send({ message: "All Projects", payload: projects });
  }
  //else send not found
  else {
    res.status(404).send({ alertMsg: "No projects found under you" });
  }
});

//get all concerns
exports.getAllConcerns = expressAsyncHandler(async (req, res) => {
  //get the emp_id of logged in user
  let emp_id = req.user.emp_id;
  //get the cencers where the project id underuser
  let concerns = await ProjectConcerns.findAll({
    include: {
      model: Projects,
      where: {
        gdo_head_id: emp_id,
      },
      attributes: ["project_name", "project_id", "project_manager_id"],
    },
    attributes: {
      exclude: ["project_id"],
    },
    order: [
      ["concern_raised_on", "DESC"],
      ["id", "DESC"],
    ],
  });
  res.send({ message: "All concerns", payload: concerns });
});

//raise resource request
exports.raiseResourceRequest = expressAsyncHandler(async (req, res) => {
  //first check the requested project is exist under logged in GDO Head

  //if exist then raise the resource request
  if (await isProjectUnderGdo(req.body.project_id, req.user.emp_id)) {
    await ResourceRequests.create(req.body);
    res
      .status(201)
      .send({ message: "Resource request is raised successfully" });
  }
  // else send the not found to client
  else {
    res.status(404).send({
      alertMsg: `No project found under you with project id: ${req.body.project_id} to raise the resource request `,
    });
  }
});

//detailed view  by project id
exports.detailedView = expressAsyncHandler(async (req, res) => {
  //check the project is under the logged in gdo or not
  //first check the requested project is exist under logged in GDO Head
  if (await isProjectUnderGdo(req.params.project_id, req.user.emp_id)) {
    //get the project details of given project along with related project updates, concerns and team composition
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

    //set concerns_count & team_biilled_count to projectDetails
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

    // set latestUpdates to projectDetails
    projectDetails.project_updates = latestUpdates;

    res.send({ message: "Project details", payload: projectDetails });
  }
  //project doest not exist uder loggedin User
  else {
    res.status(404).send({
      alertMsg: `No project found uder tou with project id ${req.params.project_id}`,
    });
  }
});

//get project by project Id
exports.getProject = expressAsyncHandler(async (req, res) => {
  //check the whether the requested project is under Loggedin GDO head
  //if exist send the project details
  let project = await isProjectUnderGdo(req.params.project_id, req.user.emp_id);
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
  }
  // else send the same to client
  else {
    res.status(400).send({
      alertMsg: `No project found under you with project id ${req.params.project_id}`,
    });
  }
});

//get the team composition
exports.getTeam = expressAsyncHandler(async (req, res) => {
  //check the requesting project team is under loggedin GDO head or not
  // if exist then send the team details
  if (await isProjectUnderGdo(req.params.project_id, req.user.emp_id)) {
    // find the team members
    let team = await TeamMembers.findAll({
      where: { project_id: req.params.project_id },
      include: {
        association: "employee",
        attributes: { exclude: ["emp_id"] },
      },
      attributes: { exclude: ["project_id"] },
    });
    res.send({ message: "team composition", payload: team });
  }
  // else send not found message
  else {
    res.status(404).send({
      alertMsg: `No project is found under you with project id as ${req.params.project_id} to get the team composition`,
    });
  }
});

//get the projects updates
exports.getProjectUpdates = expressAsyncHandler(async (req, res) => {
  //check is the project is under GDO head or not

  // if exist then send the project updates
  if ((req.params.project_id, req.user.emp_id)) {
    //last two weeks projects i.e date > new Date(Date.now()-1209600000)
    let updates = await ProjectUpdates.findAll({
      where: {
        project_id: req.params.project_id,
        date: { [Op.gt]: new Date(Date.now() - 1209600000) },
      },
      order: [["date", "DESC"]],
    });
    if (updates.length) {
      res.send({ message: "All last two weeks updates", payload: updates });
    } else {
      res.status(404).send({ alertMsg: "No project updates found" });
    }
  }
  //esle send not found
  else {
    res.status(404).send({
      alertMsg: `No project is found under you with project id as ${req.params.project_id} to get the project updates`,
    });
  }
});

//get project concerns
exports.getConcerns = expressAsyncHandler(async (req, res) => {
  let project = await Projects.findOne({
    where: {
      project_id: req.params.project_id,
      gdo_head_id: req.user.emp_id,
    },
  });
  // if exist then send the project concerns
  if (await isProjectUnderGdo(req.params.project_id, req.user.emp_id)) {
    let concerns = await ProjectConcerns.findAll({
      where: {
        project_id: req.params.project_id,
      },
      order: [
        ["concern_raised_on", "DESC"],
        ["id", "DESC"],
      ],
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
  } else {
    res.status(404).send({
      alertMsg: `No project is found under you with project id as ${req.params.project_id} to get the project concerns`,
    });
  }
});

//add the team
exports.addTeam = expressAsyncHandler(async (req, res) => {
  //check whether logged in user is GDO Head for team assigning project.. i.e the assigning project is under logged in user
  //if yes add team
  if (await isProjectUnderGdo(req.params.project_id, req.user.emp_id)) {
    //add the team mebers
    let team = await TeamMembers.bulkCreate(req.body.team_members);
    res.status(201).send({ message: "Team added successfully", payload: team });
  }
  //else send not found project under you
  else {
    res.status(404).send({
      alertMsg: `No project found under you with project id ${req.params.project_id} to add the team members`,
    });
  }
});

//update team member details
exports.updateTeamMemberDetails = expressAsyncHandler(async (req, res) => {
  //check project is uder GDO head
  //check whether logged in user is GDO Head for team assigning project.. i.e the assigning project is under logged in user
  //if yes check the team member is in project or not
  if (await isProjectUnderGdo(req.params.project_id, req.user.emp_id)) {
    let member = await TeamMembers.findOne({
      where: {
        project_id: req.body.project_id,
        resource_id: req.body.resource_id,
      },
    });

    //if member exist update details
    if (member) {
      await TeamMembers.update(req.body, {
        where: {
          project_id: req.body.project_id,
          resource_id: req.body.resource_id,
        },
      });
      res.send({ message: "Team Member details Updated" });
    } else {
      res.status(404).send({
        alertMsg: `No team member found with id ${req.body.resource_id} on project  ${req.body.project_id} to delete the team member `,
      });
    }
  } else {
    res.status(404).send({
      alertMsg: `No project found under you with project id ${req.body.project_id} to delete the team member `,
    });
  }
});

exports.deleteTeamMember = expressAsyncHandler(async (req, res) => {
  //check project is uder GDO head
  //check whether logged in user is GDO Head for team assigning project.. i.e the assigning project is under logged in user

  let project = await Projects.findOne({
    where: {
      project_id: req.params.project_id,
      gdo_head_id: req.user.emp_id,
    },
  });
  //if yes check the team member is in project or not
  if (await isProjectUnderGdo(req.params.project_id, req.user.emp_id)) {
    let member = await TeamMembers.findOne({
      where: {
        project_id: req.params.project_id,
        resource_id: req.params.resource_id,
      },
    });

    // if member exist set status to Inactive
    if (member) {
      await TeamMembers.update(
        { status: "Inactive" },
        {
          where: {
            project_id: req.params.project_id,
            resource_id: req.params.resource_id,
          },
        }
      );
      res.send({ message: "Team Member deleted" });
    } else {
      res.status(404).send({
        alertMsg: `No team member found with id ${req.params.resource_id} on project  ${req.params.project_id} to update the team member details`,
      });
    }
  } else {
    res.status(404).send({
      alertMsg: `No project found under you with project id ${req.params.project_id} to update the team member details`,
    });
  }
});
