export default async function () {
  process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'parking_test_db';
}
