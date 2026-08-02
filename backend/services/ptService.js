import pool from '../db/database.js';

export class PTService {
  // ==========================================
  // PT PLANS
  // ==========================================

  static async createPlan(data, userId) {
    const { name, monthly_fee, description } = data;
    const res = await pool.query(
      `INSERT INTO pt_plans (name, monthly_fee, description, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [name, monthly_fee, description]
    );
    return res.rows[0];
  }

  static async updatePlan(id, data, userId) {
    const { name, monthly_fee, description, status } = data;
    const res = await pool.query(
      `UPDATE pt_plans
       SET name = $1, monthly_fee = $2, description = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND is_deleted = FALSE
       RETURNING *`,
      [name, monthly_fee, description, status, id]
    );
    return res.rows[0];
  }

  static async deletePlan(id, userId) {
    const res = await pool.query(
      `UPDATE pt_plans
       SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.rows[0];
  }

  static async listPlans(showDeleted = false) {
    const query = showDeleted
      ? `SELECT * FROM pt_plans ORDER BY name ASC`
      : `SELECT * FROM pt_plans WHERE is_deleted = FALSE ORDER BY name ASC`;
    const res = await pool.query(query);
    return res.rows;
  }

  static async listActivePlans() {
    const res = await pool.query(
      `SELECT * FROM pt_plans 
       WHERE is_deleted = FALSE AND status = 'active' 
       ORDER BY name ASC`
    );
    return res.rows;
  }

  static async getPlanById(id) {
    const res = await pool.query(
      `SELECT * FROM pt_plans WHERE id = $1 AND is_deleted = FALSE`,
      [id]
    );
    return res.rows[0];
  }

  // ==========================================
  // PT CLIENTS
  // ==========================================

  static async createClient(data, userId) {
    const { member_id, trainer_id, pt_plan_id, goal, target_weight, start_date, expiry_date, monthly_fee, status } = data;

    // Validate that the selected PT plan is active
    const planRes = await pool.query(
      'SELECT status FROM pt_plans WHERE id = $1 AND is_deleted = FALSE',
      [pt_plan_id]
    );
    const plan = planRes.rows[0];
    if (!plan) {
      const err = new Error('PT Plan not found');
      err.status = 404;
      throw err;
    }
    if (plan.status !== 'active') {
      const err = new Error('Selected PT plan is inactive and cannot be assigned.');
      err.status = 400;
      throw err;
    }

    // Validate that the selected trainer is active
    const trainerRes = await pool.query(
      'SELECT status FROM pt_trainers WHERE id = $1',
      [trainer_id]
    );
    const trainer = trainerRes.rows[0];
    if (!trainer) {
      const err = new Error('Trainer not found');
      err.status = 404;
      throw err;
    }
    if (trainer.status !== 'active') {
      const err = new Error('Selected trainer is inactive and cannot be assigned.');
      err.status = 400;
      throw err;
    }

    // Duplicate active enrollment check
    const activeRes = await pool.query(
      'SELECT id FROM pt_clients WHERE member_id = $1 AND status = $2 AND is_deleted = FALSE',
      [member_id, 'Active']
    );
    if (activeRes.rows.length > 0) {
      const err = new Error('Member already has an active PT enrollment');
      err.status = 400;
      throw err;
    }

    // Start Transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `INSERT INTO pt_clients (member_id, trainer_id, pt_plan_id, goal, target_weight, start_date, expiry_date, monthly_fee, status, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING *`,
        [member_id, trainer_id, pt_plan_id, goal, target_weight || null, start_date, expiry_date, monthly_fee, status || 'Active', userId]
      );

      const newClient = res.rows[0];

      // Add to pt_renewals ledger immediately as initial payment
      await client.query(
        `INSERT INTO pt_renewals (pt_client_id, old_expiry_date, new_expiry_date, renewed_amount, renewed_by, renewed_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newClient.id, start_date, expiry_date, monthly_fee, userId, start_date]
      );

      await client.query('COMMIT');
      return newClient;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updateClient(id, data, userId) {
    const { trainer_id, pt_plan_id, goal, target_weight, start_date, expiry_date, monthly_fee, status } = data;

    // Verify that the client exists
    const clientRes = await pool.query(
      'SELECT pt_plan_id, trainer_id FROM pt_clients WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );
    const existingClient = clientRes.rows[0];
    if (!existingClient) {
      const err = new Error('PT Client not found');
      err.status = 404;
      throw err;
    }

    // If switching to a different trainer, ensure it is active
    if (parseInt(trainer_id) !== existingClient.trainer_id) {
      const trainerRes = await pool.query(
        'SELECT status FROM pt_trainers WHERE id = $1',
        [trainer_id]
      );
      const trainer = trainerRes.rows[0];
      if (!trainer) {
        const err = new Error('Trainer not found');
        err.status = 404;
        throw err;
      }
      if (trainer.status !== 'active') {
        const err = new Error('Selected trainer is inactive and cannot be assigned.');
        err.status = 400;
        throw err;
      }
    }

    // If switching to a different plan, ensure it is active
    if (parseInt(pt_plan_id) !== existingClient.pt_plan_id) {
      const planRes = await pool.query(
        'SELECT status FROM pt_plans WHERE id = $1 AND is_deleted = FALSE',
        [pt_plan_id]
      );
      const plan = planRes.rows[0];
      if (!plan) {
        const err = new Error('PT Plan not found');
        err.status = 404;
        throw err;
      }
      if (plan.status !== 'active') {
        const err = new Error('Selected PT plan is inactive and cannot be assigned.');
        err.status = 400;
        throw err;
      }
    }

    const res = await pool.query(
      `UPDATE pt_clients
       SET trainer_id = $1, pt_plan_id = $2, goal = $3, target_weight = $4, start_date = $5, expiry_date = $6, monthly_fee = $7, status = $8, updated_by = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND is_deleted = FALSE
       RETURNING *`,
      [trainer_id, pt_plan_id, goal, target_weight || null, start_date, expiry_date, monthly_fee, status, userId, id]
    );
    return res.rows[0];
  }

  static async listClients(filters = {}, userRole = '', userId = null) {
    const { search = '', status = '', trainer_id = '', goal = '', limit = 10, offset = 0 } = filters;

    let queryParams = [];
    let countParams = [];

    let whereClauses = ['c.is_deleted = FALSE'];

    // Role restrictions: Trainer only views their assigned clients
    if (userRole === 'trainer') {
      queryParams.push(userId);
      countParams.push(userId);
      whereClauses.push(`c.trainer_id = $${queryParams.length}`);
    } else if (trainer_id) {
      queryParams.push(trainer_id);
      countParams.push(trainer_id);
      whereClauses.push(`c.trainer_id = $${queryParams.length}`);
    }

    if (search) {
      queryParams.push(`%${search}%`);
      countParams.push(`%${search}%`);
      whereClauses.push(`m.name ILIKE $${queryParams.length}`);
    }

    if (status) {
      queryParams.push(status);
      countParams.push(status);
      whereClauses.push(`c.status = $${queryParams.length}`);
    }

    if (goal) {
      queryParams.push(goal);
      countParams.push(goal);
      whereClauses.push(`c.goal = $${queryParams.length}`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total Count Query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM pt_clients c
      JOIN members m ON c.member_id = m.id
      ${whereString}
    `;
    const countRes = await pool.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0].total);

    // Limit and Offset
    queryParams.push(parseInt(limit));
    const limitPlaceholder = `$${queryParams.length}`;

    queryParams.push(parseInt(offset));
    const offsetPlaceholder = `$${queryParams.length}`;

    // Clients Data Query
    const dataQuery = `
      SELECT c.*, 
             m.name as client_name, 
             m.email as client_email,
             m.phone as client_phone,
             t.name as trainer_name, 
             p.name as pt_plan_name
      FROM pt_clients c
      JOIN members m ON c.member_id = m.id
      JOIN pt_trainers t ON c.trainer_id = t.id
      JOIN pt_plans p ON c.pt_plan_id = p.id
      ${whereString}
      ORDER BY c.created_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const dataRes = await pool.query(dataQuery, queryParams);
    return {
      total,
      clients: dataRes.rows
    };
  }

  static async getClientById(id) {
    const query = `
      SELECT c.*, 
             m.name as client_name, 
             m.email as client_email,
             m.phone as client_phone,
             t.name as trainer_name, 
             p.name as pt_plan_name
      FROM pt_clients c
      JOIN members m ON c.member_id = m.id
      JOIN pt_trainers t ON c.trainer_id = t.id
      JOIN pt_plans p ON c.pt_plan_id = p.id
      WHERE c.id = $1 AND c.is_deleted = FALSE
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0];
  }

  static async renewClient(id, data, userId) {
    const { new_expiry_date, renewed_amount } = data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const clientRes = await client.query(
        'SELECT expiry_date, monthly_fee FROM pt_clients WHERE id = $1 AND is_deleted = FALSE',
        [id]
      );
      const existing = clientRes.rows[0];
      if (!existing) {
        throw new Error('PT Client not found');
      }

      const oldExpiry = existing.expiry_date;
      if (oldExpiry && new Date(oldExpiry).toISOString().split('T')[0] === new_expiry_date) {
        throw new Error('Duplicate renewal: PT plan is already renewed to this date');
      }

      // Update PT Client dates, fee, and mark Active
      await client.query(
        `UPDATE pt_clients
         SET start_date = CURRENT_DATE, expiry_date = $1, monthly_fee = $2, status = 'Active', updated_by = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [new_expiry_date, renewed_amount, userId, id]
      );

      // Insert Renewal Record
      await client.query(
        `INSERT INTO pt_renewals (pt_client_id, old_expiry_date, new_expiry_date, renewed_amount, renewed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, oldExpiry, new_expiry_date, renewed_amount, userId]
      );

      await client.query('COMMIT');

      // Fetch updated client
      const updated = await this.getClientById(id);
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async deleteClient(id, userId) {
    const res = await pool.query(
      `UPDATE pt_clients
       SET is_deleted = TRUE, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [userId, id]
    );
    return res.rows[0];
  }

  // ==========================================
  // PROGRESS TRACKING
  // ==========================================

  static async addProgress(clientId, weight, targetWeight, notes, userId) {
    const res = await pool.query(
      `INSERT INTO pt_progress (pt_client_id, weight, target_weight, notes, recorded_at, created_by, updated_by)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $5)
       RETURNING *`,
      [clientId, weight, targetWeight, notes, userId]
    );
    return res.rows[0];
  }

  static async getProgressHistory(clientId) {
    const res = await pool.query(
      `SELECT p.*, u.name as creator_name
       FROM pt_progress p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.pt_client_id = $1
       ORDER BY p.recorded_at ASC, p.created_at ASC`,
      [clientId]
    );
    return res.rows;
  }

  // ==========================================
  // TRAINER NOTES
  // ==========================================

  static async addNote(clientId, trainerId, noteText) {
    const res = await pool.query(
      `INSERT INTO pt_notes (pt_client_id, trainer_id, note, created_by, updated_by)
       VALUES ($1, $2, $3, $2, $2)
       RETURNING *`,
      [clientId, trainerId, noteText]
    );
    return res.rows[0];
  }

  static async editNote(noteId, noteText, userId) {
    const res = await pool.query(
      `UPDATE pt_notes
       SET note = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [noteText, userId, noteId]
    );
    return res.rows[0];
  }

  static async listNotes(clientId) {
    const res = await pool.query(
      `SELECT n.*, t.name as trainer_name
       FROM pt_notes n
       JOIN pt_trainers t ON n.trainer_id = t.id
       WHERE n.pt_client_id = $1
       ORDER BY n.created_at DESC`,
      [clientId]
    );
    return res.rows;
  }

  // ==========================================
  // IMAGES
  // ==========================================

  static async uploadImage(clientId, imageType, imageUrl, userId) {
    const res = await pool.query(
      `INSERT INTO pt_images (pt_client_id, image_type, image_url, uploaded_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, imageType, imageUrl, userId]
    );
    return res.rows[0];
  }

  static async getClientImages(clientId) {
    const res = await pool.query(
      `SELECT * FROM pt_images 
       WHERE pt_client_id = $1
       ORDER BY uploaded_at DESC`,
      [clientId]
    );
    return res.rows;
  }

  // ==========================================
  // DASHBOARD ANALYTICS & STATS
  // ==========================================

  static async getDashboardStats(userRole = '', userId = null) {
    let clientFilter = 'WHERE is_deleted = FALSE';
    let renewalsFilter = '';
    let params = [];

    if (userRole === 'trainer') {
      params.push(userId);
      clientFilter += ` AND trainer_id = $1`;
      renewalsFilter = `
        JOIN pt_clients c ON r.pt_client_id = c.id
        WHERE c.trainer_id = $1 AND c.is_deleted = FALSE
      `;
    }

    // 1. Total Enrolled
    const totalRes = await pool.query(`SELECT COUNT(*) as count FROM pt_clients ${clientFilter}`, params);
    const totalClients = parseInt(totalRes.rows[0].count);

    // 2. Active Enrolled
    const activeRes = await pool.query(`SELECT COUNT(*) as count FROM pt_clients ${clientFilter} AND status = 'Active'`, params);
    const activeClients = parseInt(activeRes.rows[0].count);

    // 3. Expired Enrolled
    const expiredRes = await pool.query(`SELECT COUNT(*) as count FROM pt_clients ${clientFilter} AND status = 'Expired'`, params);
    const expiredClients = parseInt(expiredRes.rows[0].count);

    // 4. Renewals Due (Expiring in next 7 days)
    const renewalsDueRes = await pool.query(
      `SELECT COUNT(*) as count FROM pt_clients 
       ${clientFilter} 
       AND status = 'Active' 
       AND expiry_date >= CURRENT_DATE 
       AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'`,
      params
    );
    const renewalsDue = parseInt(renewalsDueRes.rows[0].count);

    // 5. Total Revenue (Only query pt_renewals)
    const revParams = userRole === 'trainer' ? [userId] : [];
    const totalRevRes = await pool.query(
      `SELECT SUM(renewed_amount) as sum FROM pt_renewals r
       ${renewalsFilter}`,
      revParams
    );
    const totalRevenue = parseFloat(totalRevRes.rows[0].sum || 0);

    // 6. Monthly Revenue (Current calendar month)
    const curMonthStart = new Date();
    curMonthStart.setDate(1);
    const curMonthStartStr = curMonthStart.toISOString().split('T')[0];

    const monthlyRevParams = userRole === 'trainer' ? [userId, curMonthStartStr] : [curMonthStartStr];
    const monthlyRevQuery = userRole === 'trainer'
      ? `SELECT SUM(r.renewed_amount) as sum FROM pt_renewals r
         JOIN pt_clients c ON r.pt_client_id = c.id
         WHERE c.trainer_id = $1 AND c.is_deleted = FALSE AND r.renewed_at >= $2`
      : `SELECT SUM(renewed_amount) as sum FROM pt_renewals WHERE renewed_at >= $1`;

    const monthlyRevRes = await pool.query(monthlyRevQuery, monthlyRevParams);
    const monthlyRevenue = parseFloat(monthlyRevRes.rows[0].sum || 0);

    // 7. Trainer-wise Distribution (For Admin)
    let trainerWise = [];
    if (userRole === 'admin') {
      const trainerRes = await pool.query(`
        SELECT t.id as trainer_id, t.name as trainer_name, COUNT(c.id) as client_count
        FROM pt_trainers t
        LEFT JOIN pt_clients c ON c.trainer_id = t.id AND c.is_deleted = FALSE AND c.status = 'Active'
        GROUP BY t.id, t.name
        ORDER BY client_count DESC
      `);
      trainerWise = trainerRes.rows;
    }

    // 8. Goal-wise Distribution (For Admin/Trainer)
    const goalParams = userRole === 'trainer' ? [userId] : [];
    const goalQuery = userRole === 'trainer'
      ? `SELECT goal, COUNT(*) as count FROM pt_clients WHERE trainer_id = $1 AND is_deleted = FALSE AND status = 'Active' GROUP BY goal`
      : `SELECT goal, COUNT(*) as count FROM pt_clients WHERE is_deleted = FALSE AND status = 'Active' GROUP BY goal`;

    const goalRes = await pool.query(goalQuery, goalParams);
    const goalWise = goalRes.rows;

    return {
      totalClients,
      activeClients,
      expiredClients,
      renewalsDue,
      totalRevenue,
      monthlyRevenue,
      trainerWise,
      goalWise
    };
  }

  static async listTrainers() {
    const res = await pool.query(
      `SELECT id, name, phone, specialization, status, user_id 
       FROM pt_trainers 
       WHERE status = 'active' 
       ORDER BY name ASC`
    );
    return res.rows;
  }

  static async listAllTrainers() {
    const res = await pool.query(
      `SELECT id, name, phone, specialization, status, user_id 
       FROM pt_trainers 
       ORDER BY name ASC`
    );
    return res.rows;
  }

  static async createTrainer(data) {
    const { name, phone, specialization, status } = data;
    const res = await pool.query(
      `INSERT INTO pt_trainers (name, phone, specialization, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, phone, specialization, status || 'active']
    );
    return res.rows[0];
  }

  static async updateTrainer(id, data) {
    const { name, phone, specialization, status } = data;
    const res = await pool.query(
      `UPDATE pt_trainers
       SET name = $1, phone = $2, specialization = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, phone, specialization, status, id]
    );
    return res.rows[0];
  }

  static async deactivateTrainer(id) {
    const res = await pool.query(
      `UPDATE pt_trainers
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.rows[0];
  }

  // ==========================================
  // WEIGHT HISTORY
  // ==========================================

  static async recordWeight(clientId, weight, userId) {
    const res = await pool.query(
      `INSERT INTO pt_weight_history (pt_client_id, weight, recorded_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [clientId, weight, userId]
    );
    return res.rows[0];
  }

  static async getWeightHistory(clientId) {
    const res = await pool.query(
      `SELECT w.*, u.name as recorder_name
       FROM pt_weight_history w
       LEFT JOIN users u ON w.recorded_by = u.id
       WHERE w.pt_client_id = $1
       ORDER BY w.recorded_at DESC`,
      [clientId]
    );
    return res.rows;
  }

  // ==========================================
  // DIET PLAN
  // ==========================================

  static async getDietPlan(clientId) {
    const res = await pool.query(
      `SELECT d.*, u.name as creator_name
       FROM pt_diet_plans d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.pt_client_id = $1`,
      [clientId]
    );
    return res.rows[0];
  }

  static async saveDietPlan(clientId, title, content, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upsertRes = await client.query(
        `INSERT INTO pt_diet_plans (pt_client_id, title, content, created_by, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (pt_client_id)
         DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, created_by = EXCLUDED.created_by, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [clientId, title, content, userId]
      );
      const currentPlan = upsertRes.rows[0];

      // Add to history
      await client.query(
        `INSERT INTO pt_diet_plan_history (pt_diet_plan_id, pt_client_id, diet_title, diet_content, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [currentPlan.id, clientId, title, content, userId]
      );

      await client.query('COMMIT');
      return currentPlan;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getDietPlanHistory(clientId) {
    const res = await pool.query(
      `SELECT h.*, u.name as creator_name
       FROM pt_diet_plan_history h
       LEFT JOIN users u ON h.created_by = u.id
       WHERE h.pt_client_id = $1
       ORDER BY h.created_at DESC`,
      [clientId]
    );
    return res.rows;
  }

  // ==========================================
  // DIET PLAN TEMPLATES
  // ==========================================

  static async createTemplate(title, content, category, userId) {
    const res = await pool.query(
      `INSERT INTO pt_diet_plan_templates (title, content, category, is_active, created_by)
       VALUES ($1, $2, $3, TRUE, $4)
       RETURNING *`,
      [title, content, category, userId]
    );
    return res.rows[0];
  }

  static async updateTemplate(id, title, content, category) {
    const res = await pool.query(
      `UPDATE pt_diet_plan_templates
       SET title = $1, content = $2, category = $3
       WHERE id = $4
       RETURNING *`,
      [title, content, category, id]
    );
    return res.rows[0];
  }

  static async listTemplates(onlyActive = true) {
    const query = onlyActive
      ? `SELECT t.*, u.name as creator_name 
         FROM pt_diet_plan_templates t
         LEFT JOIN users u ON t.created_by = u.id
         WHERE t.is_active = TRUE 
         ORDER BY t.category ASC, t.title ASC`
      : `SELECT t.*, u.name as creator_name 
         FROM pt_diet_plan_templates t
         LEFT JOIN users u ON t.created_by = u.id
         ORDER BY t.category ASC, t.title ASC`;
    const res = await pool.query(query);
    return res.rows;
  }

  static async toggleTemplateActive(id, isActive) {
    const res = await pool.query(
      `UPDATE pt_diet_plan_templates
       SET is_active = $1
       WHERE id = $2
       RETURNING *`,
      [isActive, id]
    );
    return res.rows[0];
  }

  // ==========================================
  // PROGRESS IMAGES
  // ==========================================

  static async uploadProgressImage(clientId, imageType, imageUrl, caption, userId) {
    const res = await pool.query(
      `INSERT INTO pt_progress_images (pt_client_id, image_type, image_url, caption, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clientId, imageType, imageUrl, caption, userId]
    );
    return res.rows[0];
  }

  static async getProgressImages(clientId) {
    const res = await pool.query(
      `SELECT pi.*, u.name as uploader_name
       FROM pt_progress_images pi
       LEFT JOIN users u ON pi.uploaded_by = u.id
       WHERE pi.pt_client_id = $1
       ORDER BY pi.uploaded_at DESC`,
      [clientId]
    );
    return res.rows;
  }

  static async updateTargetWeight(id, targetWeight, userId) {
    const res = await pool.query(
      `UPDATE pt_clients
       SET target_weight = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND is_deleted = FALSE
       RETURNING *`,
      [targetWeight, userId, id]
    );
    return res.rows[0];
  }
}

export default PTService;
