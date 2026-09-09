-- Demo : Claire 10005 et Sofia 10007 portent le badge certifie.
-- A jouer avec Wrangler D1, pas Prisma :
--   npx wrangler d1 execute cession-courtage --local --file ./scripts/d1-certify-demo.sql
UPDATE Listing SET certificationStatus = 'CERTIFIED' WHERE publicNumber IN (10005, 10007);
