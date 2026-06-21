const { PrismaClient } = require("../app/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Test",
      email: "test@example.com",
      username: "testuser",
      status: "OFFLINE",
    },
  });
  console.log("Created user:", user);
}

main()
  .catch((e) => {
    console.error("Error creating user:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
