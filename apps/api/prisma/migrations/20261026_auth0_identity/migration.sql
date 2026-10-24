ALTER TABLE "User"
ADD COLUMN "auth0Sub" TEXT;

CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");

CREATE INDEX "User_auth0Sub_idx" ON "User"("auth0Sub");
