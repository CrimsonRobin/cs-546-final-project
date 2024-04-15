import {dbConnection} from './mongoConnection.js';

// For JSDoc types
import mongoPackage from 'mongodb';
const {Collection, Document} = mongoPackage;

/**
 *
 * @param collection
 * @returns {function(): Promise<Collection, Document>}
 */
const getCollectionFn = (collection) =>
{
    let _col = undefined;

    return async () =>
    {
        if (!_col)
        {
            const db = await dbConnection();
            _col = await db.collection(collection);
        }

        return _col;
    };
};

// Note: You will need to change the code below to have the collection required by the assignment!
/**
 *
 * @type {function(): Promise<Collection<Document>>}
 */
export const posts = getCollectionFn('');
