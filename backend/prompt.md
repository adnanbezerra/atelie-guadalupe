You are a senior software engineer working on Fastify.

Project context:
We are creating the backend for an ecommerce that will sell natural cosmetic products and also Catholic religious imagery and Rosaries

Task:
We should create a plan for the development of the backend. This plan should be as detailed as possible, with feature, constraints, database schemas, acceptation criteria, how the endpoints should work, and if possible expected responses to be used on the frontend

Constraints:
- Make no mistakes
- Always use Zod for input validation
- Always use the left/right monad 
- Indentations with four spaces
- Always follow Fastify's development concepts, using plugins and such
- Use layered architecture: route, controller, service, and database connection on repositories only

Input:
We are going to use Prisma with Postgres as ORM/BD solutions.
- First of all, we must create the user-related routes: login, register, edit
model User
id Int
uuid uuidv7
name string
email string unique
document string unique
role Role
password string
isActive bool
roleId int
createdAt, updatedAt

model Role -> there will be four roles: Admin, Subadmin, User
id int
name string

model Address
id Int
uuid uuidv7
userId int
{data related to address, such as city, country and whatnot}
createdAt, updatedAt

Only an Admin can create other Admin/Subadmin, of course. The register route should default to role user, and refuse to create and admin if the user isn't admin
We should have jwt authentication and encrypted passwords

- Second, we must create the CRUD for products. only admins and subadmins can do the CUD part
model Product
id, uuid
name string
price (in cents) int
image string 
stock int
shortDescription str
longDescription str
createdAt, updatedAt

- Third, we must create the CRUD for a products cart. Model's obvious, you can create it
- 4th, we will set the basis for the Order, creating the CRUD for it and preparing for checkout integration. I think it's a bit obvious as well, and don't worry that much about checkout yet. We will deal with it later

Requirements:
It should follow Brazilian LGPD, respect back-frontend separation, validate business rules to only accept appropriate data, implement a rate limit to prevent spam and DDOS
