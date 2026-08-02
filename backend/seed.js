import './config.js';
import bcrypt from 'bcryptjs';
import pool from './database.js';

async function seedData() {
  try {
    console.log('Seeding demo data...');

    // 1. Seed Users
    const adminHash = await bcrypt.hash('admin123', 10);
    const receptionistHash = await bcrypt.hash('recep123', 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role, name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', adminHash, 'admin', 'Admin Manager']
    );
    await pool.query(
      `INSERT INTO users (username, password_hash, role, name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO NOTHING`,
      ['receptionist', receptionistHash, 'receptionist', 'Sarah Receptionist']
    );

    // Get current date references relative to June 7, 2026
    const today = new Date('2026-06-07');

    const formatDate = (date) => date.toISOString().split('T')[0];

    const getRelativeDate = (daysOffset) => {
      const d = new Date(today);
      d.setDate(today.getDate() + daysOffset);
      return formatDate(d);
    };

    // 2. Seed Members
    const membersData = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        join_date: getRelativeDate(-45),
        start_date: getRelativeDate(-45),
        membership_type: 'Monthly',
        amount: 1200,
        status: 'active',
        expiry_date: getRelativeDate(15),
        device_user_id: '101',
        attendance_method: 'fingerprint',
        register_number: 'REG-001'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '9876543211',
        join_date: getRelativeDate(-25),
        start_date: getRelativeDate(-25),
        membership_type: 'Monthly',
        amount: 1200,
        status: 'active',
        expiry_date: getRelativeDate(5),
        device_user_id: '102',
        attendance_method: 'face',
        register_number: 'REG-002'
      },
      {
        name: 'Robert Johnson',
        email: 'robert@example.com',
        phone: '9876543212',
        join_date: getRelativeDate(-120),
        start_date: getRelativeDate(-120),
        membership_type: '3 Months',
        amount: 3500,
        status: 'inactive',
        expiry_date: getRelativeDate(-30),
        device_user_id: null,
        attendance_method: 'manual',
        register_number: 'REG-003'
      },
      {
        name: 'Alice Brown',
        email: 'alice@example.com',
        phone: '9876543213',
        join_date: getRelativeDate(-5),
        start_date: getRelativeDate(-5),
        membership_type: '1 Year',
        amount: 12000,
        status: 'active',
        expiry_date: getRelativeDate(360),
        device_user_id: '103',
        attendance_method: 'card',
        register_number: 'REG-004'
      },
      {
        name: 'Charlie Green',
        email: 'charlie@example.com',
        phone: '9876543214',
        join_date: getRelativeDate(-88),
        start_date: getRelativeDate(-88),
        membership_type: '3 Months',
        amount: 3500,
        status: 'active',
        expiry_date: getRelativeDate(2),
        device_user_id: '104',
        attendance_method: 'qr',
        register_number: 'REG-005'
      },
      {
        name: 'David Miller',
        email: 'david@example.com',
        phone: '9876543215',
        join_date: getRelativeDate(-10),
        start_date: getRelativeDate(-10),
        membership_type: 'Monthly',
        amount: 1200,
        status: 'active',
        expiry_date: getRelativeDate(20),
        device_user_id: '105',
        attendance_method: 'password',
        register_number: 'REG-006'
      },
      {
        name: 'Emma Wilson',
        email: 'emma@example.com',
        phone: '9876543216',
        join_date: getRelativeDate(-55),
        start_date: getRelativeDate(-55),
        membership_type: '6 Months',
        amount: 6800,
        status: 'active',
        expiry_date: getRelativeDate(125),
        device_user_id: null,
        attendance_method: 'manual',
        register_number: 'REG-007'
      }
    ];

    const memberIds = [];
    for (const m of membersData) {
      const existing = await pool.query('SELECT id FROM members WHERE email = $1', [m.email]);
      if (existing.rows.length > 0) {
        memberIds.push(existing.rows[0].id);
      } else {
        const result = await pool.query(
          `INSERT INTO members (name, email, phone, join_date, start_date, membership_type, amount, status, expiry_date, device_user_id, attendance_method, register_number) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
          [m.name, m.email, m.phone, m.join_date, m.start_date, m.membership_type, m.amount, m.status, m.expiry_date, m.device_user_id, m.attendance_method, m.register_number]
        );
        memberIds.push(result.rows[0].id);
      }
    }

    const makeReceipt = (idx) => `REC-20260607-${1000 + idx}`;

    // 3. Seed Payments
    const paymentsData = [
      { member_id: memberIds[0], amount: 1200.0, date: getRelativeDate(-45), payment_method: 'upi', receipt_number: makeReceipt(1), status: 'paid' },
      { member_id: memberIds[1], amount: 1200.0, date: getRelativeDate(-25), payment_method: 'card', receipt_number: makeReceipt(2), status: 'paid' },
      { member_id: memberIds[2], amount: 3000.0, date: getRelativeDate(-120), payment_method: 'cash', receipt_number: makeReceipt(3), status: 'paid' },
      { member_id: memberIds[3], amount: 10000.0, date: getRelativeDate(-5), payment_method: 'upi', receipt_number: makeReceipt(4), status: 'paid' },
      { member_id: memberIds[4], amount: 3000.0, date: getRelativeDate(-88), payment_method: 'card', receipt_number: makeReceipt(5), status: 'paid' },
      { member_id: memberIds[3], amount: 150.0, date: getRelativeDate(-1), payment_method: 'cash', receipt_number: makeReceipt(6), status: 'pending' },
      { member_id: memberIds[4], amount: 500.0, date: getRelativeDate(-1), payment_method: 'upi', receipt_number: makeReceipt(7), status: 'overdue' }
    ];

    for (const p of paymentsData) {
      await pool.query(
        `INSERT INTO payments (member_id, amount, date, payment_method, receipt_number, status) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (receipt_number) DO NOTHING`,
        [p.member_id, p.amount, p.date, p.payment_method, p.receipt_number, p.status]
      );
    }

    // 4. Seed Attendance
    const attendanceData = [
      { member_id: memberIds[0], check_in_time: '07:15 AM', date: getRelativeDate(-5), method: 'fingerprint' },
      { member_id: memberIds[0], check_in_time: '07:20 AM', date: getRelativeDate(-3), method: 'fingerprint' },
      { member_id: memberIds[0], check_in_time: '07:05 AM', date: getRelativeDate(-1), method: 'fingerprint' },
      { member_id: memberIds[0], check_in_time: '07:12 AM', date: getRelativeDate(0), method: 'fingerprint' },
      { member_id: memberIds[1], check_in_time: '08:30 AM', date: getRelativeDate(-4), method: 'face' },
      { member_id: memberIds[1], check_in_time: '08:45 AM', date: getRelativeDate(-2), method: 'face' },
      { member_id: memberIds[1], check_in_time: '08:25 AM', date: getRelativeDate(0), method: 'face' },
      { member_id: memberIds[3], check_in_time: '06:00 PM', date: getRelativeDate(-1), method: 'card' },
      { member_id: memberIds[3], check_in_time: '06:15 PM', date: getRelativeDate(0), method: 'card' },
      { member_id: memberIds[5], check_in_time: '09:05 AM', date: getRelativeDate(0), method: 'password' }
    ];

    for (const a of attendanceData) {
      const exist = await pool.query(
        'SELECT id FROM attendance WHERE member_id = $1 AND date = $2',
        [a.member_id, a.date]
      );
      if (exist.rows.length === 0) {
        await pool.query(
          `INSERT INTO attendance (member_id, check_in_time, date, attendance_method) 
           VALUES ($1, $2, $3, $4)`,
          [a.member_id, a.check_in_time, a.date, a.method]
        );
      }
    }

    // 5. Seed Device Settings
    const deviceSettingsData = [
      { device_name: 'Main Entrance Scanner', device_type: 'ZKTeco MB20', device_ip: '192.168.1.101', device_port: 4370, is_active: 1, last_sync: getRelativeDate(0) + ' 09:00:00' },
      { device_name: 'VIP Lounge Gate', device_type: 'eSSL SilkFP', device_ip: '192.168.1.102', device_port: 4370, is_active: 0, last_sync: null }
    ];

    for (const d of deviceSettingsData) {
      const exist = await pool.query(
        'SELECT id FROM device_settings WHERE device_name = $1 AND device_ip = $2',
        [d.device_name, d.device_ip]
      );
      if (exist.rows.length === 0) {
        await pool.query(
          `INSERT INTO device_settings (device_name, device_type, device_ip, device_port, is_active, last_sync) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [d.device_name, d.device_type, d.device_ip, d.device_port, d.is_active, d.last_sync]
        );
      }
    }

    // 6. Seed Trainer User
    const trainerHash = await bcrypt.hash('trainer123', 10);
    const trainerResult = await pool.query(
      `INSERT INTO users (username, password_hash, role, name) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO NOTHING RETURNING id`,
      ['trainer', trainerHash, 'trainer', 'Sam Trainer']
    );
    let trainerUserId;
    if (trainerResult.rows.length > 0) {
      trainerUserId = trainerResult.rows[0].id;
    } else {
      const userRes = await pool.query("SELECT id FROM users WHERE username = 'trainer'");
      trainerUserId = userRes.rows[0].id;
    }

    // Seed pt_trainers mapping to trainerUserId
    const ptTrainerExist = await pool.query("SELECT id FROM pt_trainers WHERE user_id = $1", [trainerUserId]);
    let trainerId;
    if (ptTrainerExist.rows.length > 0) {
      trainerId = ptTrainerExist.rows[0].id;
    } else {
      const ptTrainerInsert = await pool.query(
        `INSERT INTO pt_trainers (user_id, name, phone, specialization, status) 
         VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
        [trainerUserId, 'Sam Trainer', '9876543219', 'Bodybuilding']
      );
      trainerId = ptTrainerInsert.rows[0].id;
    }

    const adminRes = await pool.query("SELECT id FROM users WHERE username = 'admin'");
    const adminId = adminRes.rows[0].id;

    // 7. Seed PT Plans
    const plansData = [
      { name: 'Basic PT', monthly_fee: 4000.0, description: 'Basic personal training program' },
      { name: 'Premium PT', monthly_fee: 5000.0, description: 'Premium personal training with customized nutrition plans' },
      { name: 'Weight Loss PT', monthly_fee: 5500.0, description: 'Focused training and meal plans for weight reduction' },
      { name: 'Muscle Gain PT', monthly_fee: 6000.0, description: 'Hypertrophy focused training for building lean mass' }
    ];

    const planIds = {};
    for (const plan of plansData) {
      const existPlan = await pool.query('SELECT id FROM pt_plans WHERE name = $1', [plan.name]);
      if (existPlan.rows.length > 0) {
        planIds[plan.name] = existPlan.rows[0].id;
      } else {
        const result = await pool.query(
          `INSERT INTO pt_plans (name, monthly_fee, description, status) 
           VALUES ($1, $2, $3, 'active') RETURNING id`,
          [plan.name, plan.monthly_fee, plan.description]
        );
        planIds[plan.name] = result.rows[0].id;
      }
    }

    // 8. Seed PT Clients
    const ptClientsData = [
      {
        member_email: 'john@example.com',
        trainer_id: trainerId,
        pt_plan_id: planIds['Premium PT'],
        goal: 'Weight Loss',
        start_date: getRelativeDate(-15),
        expiry_date: getRelativeDate(15),
        monthly_fee: 5000.0,
        status: 'Active'
      },
      {
        member_email: 'jane@example.com',
        trainer_id: trainerId,
        pt_plan_id: planIds['Muscle Gain PT'],
        goal: 'Muscle Gain',
        start_date: getRelativeDate(-45),
        expiry_date: getRelativeDate(-15),
        monthly_fee: 6000.0,
        status: 'Expired'
      },
      {
        member_email: 'alice@example.com',
        trainer_id: trainerId,
        pt_plan_id: planIds['Premium PT'],
        goal: 'General Fitness',
        start_date: getRelativeDate(-5),
        expiry_date: getRelativeDate(2), // Expiring in next 7 days (Renewals Due)
        monthly_fee: 5000.0,
        status: 'Active'
      },
      {
        member_email: 'david@example.com',
        trainer_id: trainerId,
        pt_plan_id: planIds['Basic PT'],
        goal: 'Strength Training',
        start_date: getRelativeDate(-2),
        expiry_date: getRelativeDate(28),
        monthly_fee: 4000.0,
        status: 'Active'
      }
    ];

    const clientIds = [];
    for (const c of ptClientsData) {
      const memberRes = await pool.query('SELECT id FROM members WHERE email = $1', [c.member_email]);
      if (memberRes.rows.length === 0) continue;
      const memberId = memberRes.rows[0].id;

      const existClient = await pool.query(
        'SELECT id FROM pt_clients WHERE member_id = $1 AND pt_plan_id = $2',
        [memberId, c.pt_plan_id]
      );
      let clientId;
      if (existClient.rows.length > 0) {
        clientId = existClient.rows[0].id;
      } else {
        const result = await pool.query(
          `INSERT INTO pt_clients (member_id, trainer_id, pt_plan_id, goal, start_date, expiry_date, monthly_fee, status, created_by) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [memberId, c.trainer_id, c.pt_plan_id, c.goal, c.start_date, c.expiry_date, c.monthly_fee, c.status, adminId]
        );
        clientId = result.rows[0].id;
      }
      clientIds.push({ id: clientId, email: c.member_email, status: c.status, fee: c.monthly_fee, start: c.start_date, expiry: c.expiry_date });
    }

    // 9. Seed PT Renewals
    for (const client of clientIds) {
      const renewalExist = await pool.query('SELECT id FROM pt_renewals WHERE pt_client_id = $1', [client.id]);
      if (renewalExist.rows.length === 0) {
        await pool.query(
          `INSERT INTO pt_renewals (pt_client_id, old_expiry_date, new_expiry_date, renewed_amount, renewed_by, renewed_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [client.id, client.start, client.expiry, client.fee, adminId, client.start]
        );
      }
    }

    // 10. Seed PT Progress Logs
    const progressData = [
      { email: 'john@example.com', weight: 92.0, target: 80.0, recorded: getRelativeDate(-15), notes: 'Initial weight assessment' },
      { email: 'john@example.com', weight: 90.5, target: 80.0, recorded: getRelativeDate(-8), notes: 'Good progress, slight diet adjustments' },
      { email: 'john@example.com', weight: 89.2, target: 80.0, recorded: getRelativeDate(-1), notes: 'Feeling stronger, cardiovascular capacity improved' },
      { email: 'jane@example.com', weight: 55.0, target: 60.0, recorded: getRelativeDate(-45), notes: 'Hypertrophy target setup' },
      { email: 'jane@example.com', weight: 56.2, target: 60.0, recorded: getRelativeDate(-30), notes: 'Consistently hitting macro goals' },
      { email: 'jane@example.com', weight: 57.0, target: 60.0, recorded: getRelativeDate(-15), notes: 'Strength increased on major compounds' },
      { email: 'alice@example.com', weight: 65.0, target: 62.0, recorded: getRelativeDate(-5), notes: 'Initial scan' },
      { email: 'david@example.com', weight: 78.0, target: 82.0, recorded: getRelativeDate(-2), notes: 'Bench and squat baseline' }
    ];

    for (const p of progressData) {
      const client = clientIds.find(c => c.email === p.email);
      if (!client) continue;

      const progressExist = await pool.query(
        'SELECT id FROM pt_progress WHERE pt_client_id = $1 AND recorded_at = $2',
        [client.id, p.recorded]
      );
      if (progressExist.rows.length === 0) {
        await pool.query(
          `INSERT INTO pt_progress (pt_client_id, weight, target_weight, notes, recorded_at, created_by) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [client.id, p.weight, p.target, p.notes, p.recorded, trainerId]
        );
      }
    }

    // 11. Seed PT Notes
    const notesData = [
      { email: 'john@example.com', note: 'Arun is highly motivated. Goal is to lose 12kg in 3 months. Focus on calorie deficit and HIIT.' },
      { email: 'jane@example.com', note: 'Focusing on hypertrophy. Jane needs to increase daily protein intake.' }
    ];

    for (const n of notesData) {
      const client = clientIds.find(c => c.email === n.email);
      if (!client) continue;

      const noteExist = await pool.query(
        'SELECT id FROM pt_notes WHERE pt_client_id = $1 AND note = $2',
        [client.id, n.note]
      );
      if (noteExist.rows.length === 0) {
        await pool.query(
          `INSERT INTO pt_notes (pt_client_id, trainer_id, note, created_by) 
           VALUES ($1, $2, $3, $4)`,
          [client.id, trainerId, n.note, trainerId]
        );
      }
    }

    console.log('Demo data seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedData();
