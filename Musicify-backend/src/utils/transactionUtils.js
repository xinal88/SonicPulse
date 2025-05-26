import mongoose from 'mongoose';

export const executeTransaction = async (operations) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await operations(session);
        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};