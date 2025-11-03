import bcrypt from 'bcrypt'

const saltRounds = 10 // Mức độ phức tạp

export const handleHashedPassword = async (plainPassword) => {
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds)
  return hashedPassword
}

export const isMatch = async (inputPassword, passwordFromDB) => {
  const isMatch = await bcrypt.compare(inputPassword, passwordFromDB)
  return isMatch
}
