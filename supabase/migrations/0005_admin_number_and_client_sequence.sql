-- Diet With Noor — separate admin accounts from the client ID sequence
--
-- Admins were being assigned numbers from the same 77001+ sequence real
-- clients use (since every account, admin or not, signs up through the same
-- flow). Move the current admin account to a distinct staff-range number,
-- then renumber the real client cleanly starting at 77001 and reset the
-- sequence so the next signup continues at 77002.

update public.users set user_number = 90001 where email = 'hashirawais28@gmail.com';
update public.users set user_number = 77001 where email = 'alliedschoolelitecampus@gmail.com';

select setval('public.user_number_seq', 77001, true);
