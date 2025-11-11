import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'

const LOCATION_COLLECTION_NAME = 'locations'
const LOCATION_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(2).trim().strict(),
  address: Joi.object({
    street: Joi.string().required(),
    ward: Joi.string().required(),
    province: Joi.string().required(),
  }),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/) // E.164: +[country code][subscriber number]
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +84901234567).',
    })
    .required(),
  images: Joi.array().items(Joi.string().trim().strict()).default([]),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false),
})

const validateBeforeCreate = async (data) => {
  return await LOCATION_COLLECTION_SCHEMA.validateAsync(data, {
    abortEarly: false,
  })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data, { abortEarly: false })
    const createdLocation = await GET_DB().collection(LOCATION_COLLECTION_NAME).insertOne(validData)
    return createdLocation
  } catch (error) {
    throw new Error(error)
  }
}

const getDetailById = async (locationId) => {
  try {
    const location = await GET_DB()
      .collection(LOCATION_COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(String(locationId)),
        _destroy: { $ne: true },
      })
    return location
  } catch (error) {
    throw new Error(error)
  }
}

const getListLocation = async () => {
  try {
    const listLocation = await GET_DB()
      .collection(LOCATION_COLLECTION_NAME)
      .find({ _destroy: { $ne: true } })
      .toArray()
    return listLocation
  } catch (error) {
    throw new Error(error)
  }
}

const getListLocationForAdmin = async (page = 1, limit = 10) => {
  try {
    const db = GET_DB()
    const skip = (page - 1) * limit

    const pipeline = [
      {
        $match: { _destroy: { $ne: true } },
      },
      // Lookup equipments
      {
        $lookup: {
          from: 'equipments',
          localField: '_id',
          foreignField: 'locationId',
          pipeline: [
            {
              $match: { _destroy: { $ne: true } },
            },
          ],
          as: 'equipments',
        },
      },
      // Lookup staff and count
      {
        $lookup: {
          from: 'staffs',
          localField: '_id',
          foreignField: 'locationId',
          pipeline: [
            {
              $match: { _destroy: { $ne: true } },
            },
          ],
          as: 'staffList',
        },
      },
      // Lookup rooms and count
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: 'locationId',
          pipeline: [
            {
              $match: { _destroy: { $ne: true } },
            },
          ],
          as: 'roomList',
        },
      },
      // Add computed fields
      {
        $addFields: {
          staffCount: { $size: '$staffList' },
          roomCount: { $size: '$roomList' },
          equipmentCount: { $size: '$equipments' },
        },
      },
      // Project final structure
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          address: 1,
          images: 1,
          equipments: 1,
          staffCount: 1,
          roomCount: 1,
          equipmentCount: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]

    const locations = await db.collection(LOCATION_COLLECTION_NAME).aggregate(pipeline).toArray()

    // Count total locations
    const totalLocations = await db.collection(LOCATION_COLLECTION_NAME).countDocuments({
      _destroy: { $ne: true },
    })

    const totalPages = Math.ceil(totalLocations / limit)

    return {
      locations,
      pagination: {
        currentPage: page,
        totalPages,
        totalLocations,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  } catch (error) {
    throw new Error(error)
  }
}

const updateInfo = async (locationId, updateData) => {
  try {
    const updatedLocation = await GET_DB()
      .collection(LOCATION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(locationId)), _destroy: { $ne: true } },
        { $set: { ...updateData, updatedAt: Date.now() } },
        { returnDocument: 'after' }
      )
    return updatedLocation
  } catch (error) {
    throw new Error(error)
  }
}

// Soft delete - set _destroy flag instead of removing
const deleteLocation = async (locationId) => {
  try {
    const updatedLocation = await GET_DB()
      .collection(LOCATION_COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(String(locationId)) },
        { $set: { _destroy: true, updatedAt: Date.now() } },
        { returnDocument: 'after' }
      )
    return updatedLocation ? 1 : 0
  } catch (error) {
    throw new Error(error)
  }
}

// Hard delete (if needed)
const hardDeleteLocation = async (locationId) => {
  try {
    const updatedLocation = await GET_DB()
      .collection(LOCATION_COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(String(locationId)) })
    return updatedLocation.deletedCount
  } catch (error) {
    throw new Error(error)
  }
}

const getActiveLocations = async () => {
  try {
    const activeLocations = await GET_DB().collection(LOCATION_COLLECTION_NAME).find({ _destroy: false }).toArray()
    return activeLocations
  } catch (error) {
    throw new Error(error)
  }
}

export const locationModel = {
  LOCATION_COLLECTION_NAME,
  LOCATION_COLLECTION_SCHEMA,
  createNew,
  getDetailById,
  getListLocation,
  getListLocationForAdmin,
  getActiveLocations,
  updateInfo,
  deleteLocation,
  hardDeleteLocation,
}
