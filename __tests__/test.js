//impot supertest module
const request = require("supertest");

//import express apllication object
const app = require("../server");

//ADMIN User

// login;
test("It retuns the token", async () => {
  const response = await request(app).post("/login").send({
    email: "varun.dummy@westagilelabs.com",
    password: "Varun",
  });

  expect(response.body).toHaveProperty("token");
});

// get all projects
test("it returns the array of all projects in the organisation", async () => {
  const response = await request(app)
    .get("/admin-user/project-portfolio")
    .set(
      "authorization",
      "bearer " +
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InZhcnVuLmR1bW15QHdlc3RhZ2lsZWxhYnMuY29tIiwidXNlcl90eXBlIjoiQURNSU4tVVNFUiIsInN0YXR1cyI6dHJ1ZSwiZW1wX2lkIjo5LCJpYXQiOjE2Nzg2MzY5ODgsImV4cCI6MTY3OTI0MTc4OH0.0-kW3xFgc92fNwoyqzhmAy9oMP52CfMD12eu3G9tn08"
    );
  expect(response.body).toHaveProperty("message");
  expect(response.statusCode).toBe(200);
});

//update project
test("it updates the project details", async () => {
  const response = await request(app)
    .put("/admin-user/modify-project/project_id/1")
    .set(
      "authorization",
      "bearer " +
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InZhcnVuLmR1bW15QHdlc3RhZ2lsZWxhYnMuY29tIiwidXNlcl90eXBlIjoiQURNSU4tVVNFUiIsInN0YXR1cyI6dHJ1ZSwiZW1wX2lkIjo5LCJpYXQiOjE2Nzg2MzY5ODgsImV4cCI6MTY3OTI0MTc4OH0.0-kW3xFgc92fNwoyqzhmAy9oMP52CfMD12eu3G9tn08"
    )
    .send({
      project_id: 1,
      project_name: "WAL Pulse project",
      client_account: "West Agile Labs",
      account_manager_id: 6,
      fitness: "green",
      domain: "Finance",
      type_of_project: "Web",
      gdo_head_id: 4,
      project_manager_id: 5,
    });
  expect(response.statusCode).toBe(200);
});

// add new project
test("it adds new project", async () => {
  const response = await request(app)
    .post("/admin-user/new-project")
    .set(
      "authorization",
      "bearer " +
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InZhcnVuLmR1bW15QHdlc3RhZ2lsZWxhYnMuY29tIiwidXNlcl90eXBlIjoiQURNSU4tVVNFUiIsInN0YXR1cyI6dHJ1ZSwiZW1wX2lkIjo5LCJpYXQiOjE2Nzg2MzY5ODgsImV4cCI6MTY3OTI0MTc4OH0.0-kW3xFgc92fNwoyqzhmAy9oMP52CfMD12eu3G9tn08"
    )
    .send({
      project_name: "Online OutPass",
      client_account: "RGUKT",
      account_manager_id: 6,
      fitness: "green",
      domain: "Education",
      type_of_project: "Web",
      gdo_head_id: 4,
      project_manager_id: 5,
    });
  expect(response.statusCode).toBe(201);
});

//delete user by super-admin
test("it Deletes user ", async () => {});
