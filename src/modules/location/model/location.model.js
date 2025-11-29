import { ObjectId, ReturnDocument } from 'mongodb'
import Joi from 'joi'
import { GET_DB } from '~/config/mongodb.config.js'
import { attendanceModel } from '~/modules/attendance/model/attendance.model'

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

    // Tính ngày 30 ngày trước
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()
    const nowISO = new Date().toISOString()

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
      // Lookup attendances (30 days, đã checkout)
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'locationId',
          pipeline: [
            {
              $match: {
                _destroy: { $ne: true },
                checkoutTime: { $ne: '' }, // Đã checkout
                hours: { $gt: 0 },
                checkinTime: {
                  $gte: thirtyDaysAgoISO,
                  $lte: nowISO,
                },
              },
            },
            // Lookup user info
            {
              $lookup: {
                from: 'users',
                let: { userIdStr: { $toString: '$userId' } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [{ $toString: '$_id' }, '$$userIdStr'],
                      },
                      _destroy: { $ne: true },
                    },
                  },
                  {
                    $project: {
                      fullName: 1,
                      phone: 1,
                    },
                  },
                ],
                as: 'userInfo',
              },
            },
            {
              $unwind: {
                path: '$userInfo',
                preserveNullAndEmptyArrays: true,
              },
            },
            // Project attendance fields
            {
              $project: {
                checkinTime: 1,
                checkoutTime: 1,
                hours: 1,
                method: 1,
                fullName: { $ifNull: ['$userInfo.fullName', ''] },
                phone: { $ifNull: ['$userInfo.phone', ''] },
              },
            },
            // Sort by checkinTime descending (mới nhất trước)
            {
              $sort: { checkinTime: -1 },
            },
          ],
          as: 'attendances',
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
          attendances: 1,
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

const getTotalActiveLocations = async () => {
  try {
    const totalActiveLocations = await GET_DB().collection(LOCATION_COLLECTION_NAME).countDocuments({
      _destroy: false,
    })

    return totalActiveLocations
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Lấy top 3 location có attendance đông nhất với thời gian tập trung bình
const getTopLocationsByAttendance = async (year = new Date().getFullYear(), limit = 3) => {
  try {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)

    const result = await GET_DB()
      .collection(attendanceModel.ATTENDANCE_COLLECTION_NAME)
      .aggregate([
        {
          $match: {
            _destroy: false,
            checkinTime: {
              $gte: startOfYear.toISOString(),
              $lte: endOfYear.toISOString(),
            },
            checkoutTime: { $ne: '' }, // Chỉ tính attendance đã checkout
            hours: { $gt: 0 }, // Có thời gian tập > 0
          },
        },
        // Group theo locationId để tính thống kê
        {
          $group: {
            _id: '$locationId',
            totalAttendance: { $sum: 1 }, // Tổng số lượt tập
            totalHours: { $sum: '$hours' }, // Tổng thời gian tập
            averageHours: { $avg: '$hours' }, // Thời gian tập trung bình
            uniqueUsers: { $addToSet: '$userId' }, // Danh sách user unique
          },
        },
        // Tính số user unique
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' },
          },
        },
        // Join với locations để lấy thông tin location
        {
          $lookup: {
            from: 'locations',
            localField: '_id',
            foreignField: '_id',
            as: 'location',
          },
        },
        {
          $unwind: '$location',
        },
        // Filter location chưa bị xóa
        {
          $match: {
            'location._destroy': false,
          },
        },
        // Project kết quả theo format yêu cầu
        {
          $project: {
            id: { $toString: '$_id' },
            name: '$location.name',
            attendance: '$totalAttendance',
            avgTrainingHours: {
              $round: ['$averageHours', 1], // Làm tròn 1 chữ số thập phân
            },
            totalHours: '$totalHours',
            uniqueUsers: '$uniqueUserCount',
            address: '$location.address',
          },
        },
        // Sắp xếp theo attendance giảm dần
        {
          $sort: { attendance: -1 },
        },
        // Giới hạn top 3
        {
          $limit: limit,
        },
      ])
      .toArray()

    return result
  } catch (error) {
    throw new Error(error)
  }
}

// NEW: Lấy thống kê attendance chi tiết theo location (có thể filter theo khoảng thời gian)
const getLocationAttendanceStats = async (options = {}) => {
  try {
    const {
      startDate = null,
      endDate = null,
      locationId = null,
      period = 'all', // 'daily', 'weekly', 'monthly', 'all'
    } = options

    let matchConditions = {
      _destroy: false,
      checkoutTime: { $ne: '' },
      hours: { $gt: 0 },
    }

    // Filter theo thời gian
    if (startDate && endDate) {
      matchConditions.checkinTime = {
        $gte: startDate,
        $lte: endDate,
      }
    }

    // Filter theo location cụ thể
    if (locationId) {
      matchConditions.locationId = new ObjectId(String(locationId))
    }

    const pipeline = [{ $match: matchConditions }]

    // Group theo location hoặc theo period
    if (period === 'all') {
      pipeline.push({
        $group: {
          _id: '$locationId',
          attendance: { $sum: 1 },
          totalHours: { $sum: '$hours' },
          avgTrainingHours: { $avg: '$hours' },
          uniqueUsers: { $addToSet: '$userId' },
          peakHours: {
            $push: {
              $hour: { $dateFromString: { dateString: '$checkinTime' } },
            },
          },
        },
      })
    } else if (period === 'monthly') {
      pipeline.push({
        $group: {
          _id: {
            locationId: '$locationId',
            year: { $year: { $dateFromString: { dateString: '$checkinTime' } } },
            month: { $month: { $dateFromString: { dateString: '$checkinTime' } } },
          },
          attendance: { $sum: 1 },
          avgTrainingHours: { $avg: '$hours' },
        },
      })
    }

    pipeline.push(
      {
        $lookup: {
          from: 'locations',
          localField: period === 'all' ? '_id' : '_id.locationId',
          foreignField: '_id',
          as: 'location',
        },
      },
      {
        $unwind: '$location',
      },
      {
        $match: {
          'location._destroy': false,
        },
      }
    )

    if (period === 'all') {
      pipeline.push(
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' },
            // Tính giờ cao điểm (mode of peak hours)
            mostPopularHour: {
              $arrayElemAt: [
                {
                  $map: {
                    input: { $setUnion: '$peakHours' },
                    as: 'hour',
                    in: {
                      hour: '$$hour',
                      count: {
                        $size: {
                          $filter: {
                            input: '$peakHours',
                            cond: { $eq: ['$$this', '$$hour'] },
                          },
                        },
                      },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            id: { $toString: period === 'all' ? '$_id' : '$_id.locationId' },
            name: '$location.name',
            attendance: 1,
            avgTrainingHours: { $round: ['$avgTrainingHours', 1] },
            totalHours: 1,
            uniqueUsers: '$uniqueUserCount',
            mostPopularHour: '$mostPopularHour.hour',
            address: '$location.address',
          },
        }
      )
    }

    pipeline.push({
      $sort: { attendance: -1 },
    })

    const result = await GET_DB().collection(attendanceModel.ATTENDANCE_COLLECTION_NAME).aggregate(pipeline).toArray()

    return result
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
  getTotalActiveLocations,

  getLocationAttendanceStats,
  getTopLocationsByAttendance,
}

const data = [
  {
    _id: '6922d2e9f19f6286245443e3',
    name: 'THE GYM Hoàng Văn Thụ',
    phone: '+84987650000',
    address: {
      street: '123 Hoàng Văn Thụ',
      ward: 'Bình Trưng',
      province: 'Hồ Chí Minh',
    },
    images: [
      'https://res.cloudinary.com/djw2dyvbc/image/upload/v1763889897/gms-image/rqjjagjybyvq8gcef3op.webp',
      'https://res.cloudinary.com/djw2dyvbc/image/upload/v1763889898/gms-image/yl9ff1nbuwz1vc9gpkya.jpg',
      'https://res.cloudinary.com/djw2dyvbc/image/upload/v1763889898/gms-image/fmxko2eidtberzbhpqsy.webp',
    ],
    equipments: [],
    staffCount: 1,
    roomCount: 0,
    equipmentCount: 0,
    attendances: [
      {
        checkinTime: '',
        checkoutTime: '',
        hours: 0.12,
        fullName: '', // userId -> users,
        phone: '',
        method: 'qrCode',
      },
    ],
  },
  {
    _id: '68b80223c88e5c2130e084e8',
    name: 'The gym Nguyễn Kiệm',
    phone: '+84987654321',
    address: {
      street: '123 Lê Lợi',
      ward: 'Phường Bến Thành',
      province: 'Hồ Chí Minh',
    },
    images: [
      'https://res.cloudinary.com/djw2dyvbc/image/upload/v1760686278/gms-image/uazqqvqo2cru82uvfuay.jpg',
      'https://res.cloudinary.com/djw2dyvbc/image/upload/v1760686278/gms-image/uazqqvqo2cru82uvfuay.jpg',
      'https://res.cloudinary.com/djw2dyvbc/image/upload/v1760686278/gms-image/uazqqvqo2cru82uvfuay.jpg',
    ],
    equipments: [
      {
        _id: '6926a4f0e5bb04a7614e46f0',
        name: 'Máy chạy bộ',
        brand: 'BMC',
        price: 100000000,
        locationId: '68b80223c88e5c2130e084e8',
        purchaseDate: '2025-11-27T00:00:00.000Z',
        muscleCategories: ['core', 'legs', 'hamstrings', 'quadriceps'],
        image: 'https://res.cloudinary.com/djw2dyvbc/image/upload/v1764140272/gms-image/cppb4m8gvrppnhsc6rhy.png',
        status: 'active',
        maintenanceHistory: [],
        createdAt: 1764140272290,
        updatedAt: null,
        _destroy: false,
      },
    ],
    staffCount: 2,
    roomCount: 5,
    equipmentCount: 1,
  },
]
