export const getMongoConfig = () =>
{
    return {
        serverUrl: `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
        database: `${process.env.DATABASE_NAME}`
    };
};
