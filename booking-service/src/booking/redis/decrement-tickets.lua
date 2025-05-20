-- KEYS[1]: seatTypeId (Redis key storing remainingTickets)
-- ARGV[1]: quantity (number of tickets to book)

local key = KEYS[1]
local quantity = tonumber(ARGV[1])

-- Validate quantity
if not quantity or quantity <= 0 then
  return -2 -- Invalid quantity
end

-- Get current remaining tickets
local remaining = tonumber(redis.call('GET', key))
if not remaining then
  return -3 -- Key does not exist
end

-- Check availability
if remaining < quantity then
  return -1 -- Not enough tickets
end

-- Attempt to decrement
local newRemaining = redis.call('DECRBY', key, quantity)

-- Sanity check rollback (should never happen if logic is correct)
if newRemaining < 0 then
  redis.call('INCRBY', key, quantity) -- rollback
  return -4 -- Negative value after decrement
end

return newRemaining -- Success
