/*
  # Fix Auth DB Connection Strategy

  1. Changes
    - Switch Auth server from fixed connection count (10) to percentage-based allocation
    - This allows Auth to scale automatically with instance size increases

  2. Security
    - Improves Auth server performance and scalability
*/

-- Switch Auth to percentage-based connection pooling (10% of total connections)
ALTER ROLE authenticator SET pgrst.db_pool_size = '0.1';
