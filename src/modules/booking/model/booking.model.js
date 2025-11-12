import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators.js'
import { BOOKING_STATUS } from '~/utils/constants.js'
import { scheduleModel } from '~/modules/schedule/model/schedule.model'

const BOOKING_COLLECTION_NAME = 'bookings'
const BOOKING_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  scheduleId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  locationId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  status: Joi.string()
    .valid(BOOKING_STATUS.BOOKING, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.PENDING, BOOKING_STATUS.CANCELLED)
    .default(BOOKING_STATUS.PENDING),
  price: Joi.number().min(0).required(),
  title: Joi.string().trim().strict().allow('').default(''),
  note: Joi.string().trim().strict().allow('').default(''),
  trainerAdvice: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().trim().strict(),
        content: Joi.array().items(Joi.string().trim().strict()),
      })
    )
    .default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await BOOKING_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })

    const newBookingToAdd = {
      ...validData,
      userId: new ObjectId(String(validData.userId)),
      scheduleId: new ObjectId(String(validData.scheduleId)),
      locationId: new ObjectId(String(validData.locationId)),
    }

    const createdBooking = await GET_DB().collection(BOOKING_COLLECTION_NAME).insertOne(newBookingToAdd)
    return createdBooking
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (bookingId) => {
  try {
    const booking = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(bookingId)),
      })
    return booking
  } catch (error) {
    throw new Error(error)
  }
}

const getBookingsByUserId = async (userId) => {
  try {
    const bookings = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .find({
        userId: new ObjectId(String(userId)),
      })
      .toArray()
    return bookings
  } catch (error) {
    throw new Error(error)
  }
}

const getUpcomingBookingsByUserId = async (userId) => {
  try {
    const now = new Date()

    const result = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .aggregate([
        // Match bookings for specific user from current time to future
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
            // Note: You'll need to add scheduleTime field to booking schema
            // or join with schedules to get the actual schedule time
          },
        },
        // Join with schedules to get schedule timing information
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        // Unwind schedule array
        {
          $unwind: '$schedule',
        },
        // Filter for upcoming sessions only (after current time)
        {
          $match: {
            'schedule.startTime': { $gte: now.toISOString() },
            'schedule._destroy': false,
          },
        },
        // Join with trainers collection
        {
          $lookup: {
            from: 'trainers',
            localField: 'schedule.trainerId',
            foreignField: '_id',
            as: 'trainer',
          },
        },
        // Unwind trainer array
        {
          $unwind: '$trainer',
        },
        // Join with users collection to get trainer's user info
        {
          $lookup: {
            from: 'users',
            localField: 'trainer.userId',
            foreignField: '_id',
            as: 'trainerUser',
          },
        },
        // Unwind trainer user array
        {
          $unwind: '$trainerUser',
        },
        // Join with locations collection
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        // Unwind location array
        {
          $unwind: '$location',
        },
        // Join with reviews to calculate trainer rating
        {
          $lookup: {
            from: 'reviews',
            localField: 'trainer._id',
            foreignField: 'trainerId',
            as: 'reviews',
          },
        },
        // Group by trainer to aggregate all sessions for each trainer
        {
          $group: {
            _id: '$trainer._id',
            trainer: { $first: '$trainer' },
            trainerUser: { $first: '$trainerUser' },
            reviews: { $first: '$reviews' },
            allSessions: {
              $push: {
                bookingId: '$_id',
                startTime: '$schedule.startTime',
                endTime: '$schedule.endTime',
                location: {
                  _id: '$location._id',
                  name: '$location.name',
                  address: '$location.address',
                },
                status: '$status',
                price: '$price',
                note: '$note',
              },
            },
            createdAt: { $first: '$createdAt' },
          },
        },
        // Add calculated fields
        {
          $addFields: {
            // Calculate average rating from reviews
            'trainer.rating': {
              $cond: {
                if: { $gt: [{ $size: '$reviews' }, 0] },
                then: {
                  $round: [
                    {
                      $avg: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$reviews',
                              cond: { $eq: ['$$this._destroy', false] },
                            },
                          },
                          as: 'review',
                          in: '$$review.rating',
                        },
                      },
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
          },
        },
        // Project the final structure to match your mock data
        {
          $project: {
            _id: 0,
            trainer: {
              trainerId: '$trainer._id',
              userInfo: {
                fullName: '$trainerUser.fullName',
                avatar: '$trainerUser.avatar',
                email: '$trainerUser.email',
                phone: '$trainerUser.phone',
              },
              specialization: '$trainer.specialization',
              rating: '$trainer.rating',
              pricePerHour: '$trainer.pricePerHour',
            },
            allSessions: 1,
          },
        },
        // Sort by earliest upcoming session
        {
          $sort: {
            'allSessions.startTime': 1,
          },
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(`Error fetching upcoming bookings: ${error.message}`)
  }
}

// Alternative simpler version if you don't need complex grouping
const getUpcomingBookingsByUserIdSimple = async (userId) => {
  try {
    const now = new Date()

    const bookings = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .aggregate([
        // Match user's bookings
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
          },
        },
        // Join with schedules
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        { $unwind: '$schedule' },
        // Filter for upcoming only
        {
          $match: {
            'schedule.startTime': { $gte: now.toISOString() },
            'schedule._destroy': false,
          },
        },
        // Join with trainer info
        {
          $lookup: {
            from: 'trainers',
            localField: 'schedule.trainerId',
            foreignField: '_id',
            as: 'trainer',
          },
        },
        { $unwind: '$trainer' },
        // Join with trainer user info
        {
          $lookup: {
            from: 'users',
            localField: 'trainer.userId',
            foreignField: '_id',
            as: 'trainerUser',
          },
        },
        { $unwind: '$trainerUser' },
        // Join with location
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        { $unwind: '$location' },
        // Project final structure
        {
          $project: {
            bookingId: '$_id',
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            trainer: {
              trainerId: '$trainer._id',
              fullName: '$trainerUser.fullName',
              avatar: '$trainerUser.avatar',
              specialization: '$trainer.specialization',
              pricePerHour: '$trainer.pricePerHour',
            },
            location: {
              _id: '$location._id',
              name: '$location.name',
              address: '$location.address',
            },
            status: 1,
            note: 1,
            createdAt: 1,
          },
        },
        // Sort by start time
        {
          $sort: { startTime: 1 },
        },
      ])
      .toArray()

    return bookings
  } catch (error) {
    throw new Error(`Error fetching upcoming bookings: ${error.message}`)
  }
}

const checkUserBookingConflict = async (userId, scheduleId) => {
  try {
    // First, get the schedule details to know the time range
    const schedule = await GET_DB()
      .collection(scheduleModel.SCHEDULE_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(scheduleId)),
        _destroy: false,
      })

    // If schedule doesn't exist or is destroyed, no conflict can occur
    if (!schedule) {
      return null
    }

    const { startTime, endTime } = schedule

    // Find if user has any existing bookings that overlap with this time slot
    const conflict = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .aggregate([
        // Match user's active bookings
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
            // Optionally exclude cancelled bookings from conflict check
            status: { $ne: BOOKING_STATUS.CANCELLED },
          },
        },
        // Join with schedules to get timing information
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        // Unwind the schedule array
        {
          $unwind: '$schedule',
        },
        // Filter for time overlap and active schedules
        {
          $match: {
            'schedule._destroy': false,
            // Overlap condition: existing.start < newEnd && existing.end > newStart
            'schedule.startTime': { $lt: endTime },
            'schedule.endTime': { $gt: startTime },
          },
        },
        // Limit to first conflict found (we only need to know if one exists)
        {
          $limit: 1,
        },
        // Project relevant information about the conflict
        {
          $project: {
            bookingId: '$_id',
            scheduleId: '$scheduleId',
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            status: '$status',
          },
        },
      ])
      .toArray()

    // Return the first conflict if found, otherwise null
    return conflict.length > 0 ? conflict[0] : null
  } catch (error) {
    throw new Error(`Error checking booking conflict: ${error.message}`)
  }
}

const getHistoryBookingsByUserId = async (userId) => {
  try {
    const now = new Date()

    const result = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .aggregate([
        // Match bookings for specific user that are in the past
        {
          $match: {
            userId: new ObjectId(String(userId)),
            _destroy: false,
          },
        },
        // Join with schedules to get schedule timing information
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        // Unwind schedule array
        {
          $unwind: '$schedule',
        },
        // Filter for past sessions only (before current time)
        {
          $match: {
            'schedule.endTime': { $lt: now.toISOString() },
            'schedule._destroy': false,
          },
        },
        // Join with trainers collection
        {
          $lookup: {
            from: 'trainers',
            localField: 'schedule.trainerId',
            foreignField: '_id',
            as: 'trainer',
          },
        },
        // Unwind trainer array
        {
          $unwind: '$trainer',
        },
        // Join with users collection to get trainer's user info
        {
          $lookup: {
            from: 'users',
            localField: 'trainer.userId',
            foreignField: '_id',
            as: 'trainerUser',
          },
        },
        // Unwind trainer user array
        {
          $unwind: '$trainerUser',
        },
        // Join with locations collection
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        // Unwind location array
        {
          $unwind: '$location',
        },
        // Join with reviews collection (left join - review may not exist)
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'bookingId',
            as: 'reviewData',
          },
        },
        // Join with all reviews for this trainer to calculate rating
        {
          $lookup: {
            from: 'reviews',
            localField: 'trainer._id',
            foreignField: 'trainerId',
            as: 'trainerReviews',
          },
        },
        // Add calculated fields
        {
          $addFields: {
            // Calculate average rating from all trainer reviews
            trainerRating: {
              $cond: {
                if: { $gt: [{ $size: '$trainerReviews' }, 0] },
                then: {
                  $round: [
                    {
                      $avg: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$trainerReviews',
                              cond: { $eq: ['$$this._destroy', false] },
                            },
                          },
                          as: 'review',
                          in: '$$review.rating',
                        },
                      },
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            // Get the review for this specific booking (if exists)
            bookingReview: {
              $cond: {
                if: { $gt: [{ $size: '$reviewData' }, 0] },
                then: { $arrayElemAt: ['$reviewData', 0] },
                else: null,
              },
            },
          },
        },
        // Project the final structure to match your mock data
        {
          $project: {
            bookingId: '$_id',
            originalStatus: '$status', // Keep track of original status
            status: {
              $cond: {
                if: {
                  $or: [{ $eq: ['$status', BOOKING_STATUS.BOOKING] }, { $eq: ['$status', BOOKING_STATUS.PENDING] }],
                },
                then: BOOKING_STATUS.COMPLETED,
                else: '$status',
              },
            },
            price: 1,
            note: 1,
            trainerAdvice: 1,
            trainer: {
              trainerId: '$trainer._id',
              userInfo: {
                fullName: '$trainerUser.fullName',
                avatar: '$trainerUser.avatar',
                email: '$trainerUser.email',
              },
              specialization: '$trainer.specialization',
              rating: '$trainerRating',
            },
            session: {
              startTime: '$schedule.startTime',
              endTime: '$schedule.endTime',
              location: {
                name: '$location.name',
                address: '$location.address',
              },
            },
            review: {
              $cond: {
                if: { $ne: ['$bookingReview', null] },
                then: {
                  rating: '$bookingReview.rating',
                  comment: '$bookingReview.comment',
                },
                else: {},
              },
            },
          },
        },
        // Sort by session end time (most recent first)
        {
          $sort: {
            'session.endTime': -1,
          },
        },
      ])
      .toArray()

    // Update the status in the database for bookings that need to be completed
    const bookingsToUpdate = result
      .filter(
        (booking) =>
          booking.originalStatus === BOOKING_STATUS.BOOKING || booking.originalStatus === BOOKING_STATUS.PENDING
      )
      .map((booking) => booking.bookingId)

    if (bookingsToUpdate.length > 0) {
      await GET_DB()
        .collection(BOOKING_COLLECTION_NAME)
        .updateMany(
          {
            _id: { $in: bookingsToUpdate },
          },
          {
            $set: {
              status: BOOKING_STATUS.COMPLETED,
              updatedAt: Date.now(),
            },
          }
        )
    }

    // Remove the originalStatus field from the result
    const cleanedResult = result.map(({ originalStatus, ...booking }) => booking)

    return cleanedResult
  } catch (error) {
    throw new Error(`Error fetching history bookings: ${error.message}`)
  }
}

const getAllBookings = async () => {
  try {
    const bookings = await GET_DB().collection(BOOKING_COLLECTION_NAME).find({}).toArray()
    return bookings
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (bookingId, updateData) => {
  try {
    const updated = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(bookingId)) },
        { $set: { ...updateData, updatedAt: Date.now() } },
        { returnDocument: 'after' }
      )
    return updated
  } catch (error) {
    throw new Error(error)
  }
}

const deleteBooking = async (bookingId) => {
  try {
    const deleted = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(String(bookingId)) })
    return deleted.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

// Soft delete by setting _destroy flag
const softDeleteBooking = async (bookingId) => {
  try {
    const updated = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(bookingId)) },
        { $set: { _destroy: true, updatedAt: Date.now() } },
        { returnDocument: 'after' }
      )
    return updated
  } catch (error) {
    throw new Error(error)
  }
}

const getBookingsByTrainerId = async (trainerId) => {
  try {
    const result = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .aggregate([
        // Step 1: Join with schedules to get schedule information
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        // Unwind schedule array
        {
          $unwind: '$schedule',
        },
        // Step 2: Filter bookings by trainerId from schedule
        {
          $match: {
            'schedule.trainerId': new ObjectId(String(trainerId)),
            _destroy: false,
            'schedule._destroy': false,
          },
        },
        // Step 3: Join with users collection to get user information
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        // Unwind user array
        {
          $unwind: '$user',
        },
        // Step 4: Join with locations collection to get location details
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        // Unwind location array
        {
          $unwind: '$location',
        },
        // Step 5: Join with reviews collection (left join - review may not exist)
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'bookingId',
            as: 'reviewData',
          },
        },
        // Step 6: Add calculated fields for review
        {
          $addFields: {
            bookingReview: {
              $cond: {
                if: { $gt: [{ $size: '$reviewData' }, 0] },
                then: { $arrayElemAt: ['$reviewData', 0] },
                else: null,
              },
            },
          },
        },
        // Step 7: Project the final structure to match the required data format
        {
          $project: {
            _id: 1,
            userInfo: {
              fullName: '$user.fullName',
              phone: '$user.phone',
              avatar: '$user.avatar',
            },
            startTime: '$schedule.startTime',
            endTime: '$schedule.endTime',
            locationName: '$location.name',
            address: {
              street: '$location.address.street',
              ward: '$location.address.ward',
              province: '$location.address.province',
            },
            status: 1,
            note: 1,
            price: 1,
            title: 1,
            trainerAdvice: 1,
            review: {
              $cond: {
                if: { $ne: ['$bookingReview', null] },
                then: {
                  rating: '$bookingReview.rating',
                  comment: '$bookingReview.comment',
                },
                else: {
                  rating: null,
                  comment: '',
                },
              },
            },
          },
        },
        // Step 8: Sort by start time (most recent first)
        {
          $sort: {
            startTime: -1,
          },
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(`Error fetching bookings by trainer: ${error.message}`)
  }
}

// Lấy các booking sắp tới trong khoảng thời gian nhất định để gửi reminder
const getUpcomingBookingsForReminder = async (minutesBefore) => {
  try {
    const now = new Date()
    const reminderTime = new Date(now.getTime() + minutesBefore * 60 * 1000)

    // Lấy booking có startTime trong khoảng từ now đến reminderTime
    const upcomingBookings = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .aggregate([
        // Match bookings với status BOOKING và trong khoảng thời gian reminder
        {
          $match: {
            status: BOOKING_STATUS.BOOKING,
            _destroy: false,
          },
        },
        // Join với schedules để lấy startTime
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        {
          $unwind: '$schedule',
        },
        // Filter theo thời gian
        {
          $match: {
            $expr: {
              $and: [
                { $gte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, now] },
                { $lte: [{ $dateFromString: { dateString: '$schedule.startTime' } }, reminderTime] },
              ],
            },
          },
        },
        // Join với trainers để lấy trainer info
        {
          $lookup: {
            from: 'trainers',
            localField: 'schedule.trainerId',
            foreignField: '_id',
            as: 'trainer',
          },
        },
        {
          $unwind: '$trainer',
        },
        // Join với users để lấy trainer user info
        {
          $lookup: {
            from: 'users',
            localField: 'trainer.userId',
            foreignField: '_id',
            as: 'trainerUser',
          },
        },
        {
          $unwind: '$trainerUser',
        },
        // Join với users để lấy booking user info
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'bookingUser',
          },
        },
        {
          $unwind: '$bookingUser',
        },
        // Join với locations để lấy location info
        {
          $lookup: {
            from: 'locations',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location',
          },
        },
        {
          $unwind: '$location',
        },
        // Project final structure
        {
          $project: {
            _id: 1,
            title: 1,
            status: 1,
            price: 1,
            note: 1,
            userId: 1,
            scheduleId: 1,
            locationId: 1,
            schedule: {
              _id: '$schedule._id',
              startTime: '$schedule.startTime',
              endTime: '$schedule.endTime',
              trainerId: '$schedule.trainerId',
            },
            trainer: {
              _id: '$trainer._id',
              userId: '$trainer.userId',
              specialization: '$trainer.specialization',
              pricePerHour: '$trainer.pricePerHour',
            },
            trainerUser: {
              _id: '$trainerUser._id',
              fullName: '$trainerUser.fullName',
              phone: '$trainerUser.phone',
              avatar: '$trainerUser.avatar',
            },
            bookingUser: {
              _id: '$bookingUser._id',
              fullName: '$bookingUser.fullName',
              phone: '$bookingUser.phone',
              avatar: '$bookingUser.avatar',
            },
            location: {
              _id: '$location._id',
              name: '$location.name',
              address: '$location.address',
            },
          },
        },
        // Sort by startTime
        {
          $sort: {
            'schedule.startTime': 1,
          },
        },
      ])
      .toArray()

    return upcomingBookings
  } catch (error) {
    throw new Error(error)
  }
}

const getBookingsToUpdateStatus = async () => {
  try {
    const now = new Date()

    const bookingsToUpdate = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .aggregate([
        // Match bookings có status "booking"
        {
          $match: {
            status: BOOKING_STATUS.BOOKING, // 'booking'
            _destroy: false,
          },
        },
        // Join với schedules để lấy endTime
        {
          $lookup: {
            from: 'schedules',
            localField: 'scheduleId',
            foreignField: '_id',
            as: 'schedule',
          },
        },
        {
          $unwind: '$schedule',
        },
        // Filter booking có endTime đã qua
        {
          $match: {
            $expr: {
              $lt: [{ $dateFromString: { dateString: '$schedule.endTime' } }, now],
            },
            'schedule._destroy': false,
          },
        },
        // Project thông tin cần thiết
        {
          $project: {
            _id: 1,
            userId: 1,
            scheduleId: 1,
            status: 1,
            endTime: '$schedule.endTime',
            startTime: '$schedule.startTime',
          },
        },
      ])
      .toArray()

    return bookingsToUpdate
  } catch (error) {
    throw new Error(`Error getting bookings to update status: ${error.message}`)
  }
}

// Hàm update nhiều booking status cùng lúc
const updateMultipleBookingStatus = async (bookingIds, newStatus) => {
  try {
    const result = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .updateMany(
        {
          _id: { $in: bookingIds.map((id) => new ObjectId(String(id))) },
        },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date(),
          },
        }
      )

    return {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    }
  } catch (error) {
    throw new Error(`Error updating multiple booking status: ${error.message}`)
  }
}

// Hàm update single booking status (đã có updateInfo nhưng này chuyên dụng hơn)
const updateBookingStatus = async (bookingId, newStatus) => {
  try {
    const result = await GET_DB()
      .collection(BOOKING_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(bookingId)) },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      )

    return result.value
  } catch (error) {
    throw new Error(`Error updating booking status: ${error.message}`)
  }
}

// Cập nhật export để include các hàm mới:
export const bookingModel = {
  BOOKING_COLLECTION_NAME,
  BOOKING_COLLECTION_SCHEMA,
  validateBeforeCreate,
  createNew,
  getDetailById,
  getBookingsByUserId,
  getUpcomingBookingsByUserId,
  getHistoryBookingsByUserId,
  getAllBookings,
  updateInfo,
  deleteBooking,
  softDeleteBooking,
  checkUserBookingConflict,
  getBookingsByTrainerId,
  getUpcomingBookingsForReminder,

  getBookingsToUpdateStatus, // Lấy bookings cần update status
  updateMultipleBookingStatus, // Update nhiều bookings cùng lúc
  updateBookingStatus, // Update single booking status
}
