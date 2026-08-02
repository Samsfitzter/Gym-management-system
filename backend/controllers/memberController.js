import MemberService from '../services/memberService.js';

export class MemberController {
  static async getMembers(req, res) {
    const { q, search, limit, page, status, expiring } = req.query;
    try {
      const filters = {
        search: search || q || '',
        limit: limit ? parseInt(limit, 10) : 10,
        page: page ? parseInt(page, 10) : 1,
        status: status || '',
        expiring: expiring || ''
      };

      const result = await MemberService.getMembers(filters);

      return res.json({
        success: true,
        data: result,
        message: 'Members retrieved successfully'
      });
    } catch (err) {
      console.error('Get members controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }

  static async getMemberById(req, res) {
    const { id } = req.params;
    try {
      const member = await MemberService.getMemberById(id);
      if (!member) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Member not found'
        });
      }
      return res.json({
        success: true,
        data: member,
        message: 'Member profile retrieved successfully'
      });
    } catch (err) {
      console.error('Get member profile controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error'
      });
    }
  }

  static async createMember(req, res) {
    try {
      // Validate and clean phone
      let phone = req.body.phone;
      if (!phone) {
        throw new Error('Phone number is required');
      }
      let cleanedPhone = String(phone).trim();
      if (!/^\d+$/.test(cleanedPhone.replace(/\s/g, ''))) {
        throw new Error('Phone number must contain digits only');
      }
      cleanedPhone = cleanedPhone.replace(/\s/g, '');
      if (cleanedPhone.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits');
      }
      req.body.phone = cleanedPhone;

      // Validate DOB & Emergency Contact
      const { date_of_birth, emergency_contact_name, emergency_contact_phone } = req.body;
      if (!emergency_contact_name || !String(emergency_contact_name).trim()) {
        throw new Error('Emergency contact name is required');
      }
      if (!emergency_contact_phone || !String(emergency_contact_phone).trim()) {
        throw new Error('Emergency contact phone is required');
      }
      if (!date_of_birth) {
        throw new Error('Date of birth is required');
      }
      if (date_of_birth) {
        const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dobRegex.test(date_of_birth)) {
          throw new Error('Date of birth must be in YYYY-MM-DD format');
        }
        const dob = new Date(date_of_birth);
        const today = new Date();
        if (dob > today) {
          throw new Error('Date of birth cannot be in the future');
        }
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age > 100) {
          throw new Error('Age cannot exceed 100 years');
        }
      }

      const result = await MemberService.createMember(req.body);
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Member added successfully'
      });
    } catch (err) {
      console.error('Create member controller error:', err.message);
      const isValidationError = err.message.includes('required') || 
                               err.message.includes('must be') || 
                               err.message.includes('digits') || 
                               err.message.includes('exceed') || 
                               err.message.includes('future') || 
                               err.message.includes('format') || 
                               err.message.includes('Missing') || 
                               err.message.includes('already');
      const statusCode = isValidationError ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }

  static async updateMember(req, res) {
    const { id } = req.params;
    try {
      // Validate and clean phone
      let phone = req.body.phone;
      if (!phone) {
        throw new Error('Phone number is required');
      }
      let cleanedPhone = String(phone).trim();
      if (!/^\d+$/.test(cleanedPhone.replace(/\s/g, ''))) {
        throw new Error('Phone number must contain digits only');
      }
      cleanedPhone = cleanedPhone.replace(/\s/g, '');
      if (cleanedPhone.length !== 10) {
        throw new Error('Phone number must be exactly 10 digits');
      }
      req.body.phone = cleanedPhone;

      // Validate DOB & Emergency Contact
      const { date_of_birth, emergency_contact_name, emergency_contact_phone } = req.body;
      if (!emergency_contact_name || !String(emergency_contact_name).trim()) {
        throw new Error('Emergency contact name is required');
      }
      if (!emergency_contact_phone || !String(emergency_contact_phone).trim()) {
        throw new Error('Emergency contact phone is required');
      }
      if (!date_of_birth) {
        throw new Error('Date of birth is required');
      }
      if (date_of_birth) {
        const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dobRegex.test(date_of_birth)) {
          throw new Error('Date of birth must be in YYYY-MM-DD format');
        }
        const dob = new Date(date_of_birth);
        const today = new Date();
        if (dob > today) {
          throw new Error('Date of birth cannot be in the future');
        }
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age > 100) {
          throw new Error('Age cannot exceed 100 years');
        }
      }

      const result = await MemberService.updateMember(id, req.body);
      return res.json({
        success: true,
        data: result,
        message: 'Member details updated successfully'
      });
    } catch (err) {
      console.error('Update member controller error:', err.message);
      const isValidationError = err.message.includes('required') || 
                               err.message.includes('must be') || 
                               err.message.includes('digits') || 
                               err.message.includes('exceed') || 
                               err.message.includes('future') || 
                               err.message.includes('format') || 
                               err.message.includes('Missing') || 
                               err.message.includes('already');
      const statusCode = isValidationError ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }

  static async updateMemberStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await MemberService.updateMemberStatus(id, status);
      return res.json({
        success: true,
        data: null,
        message: `Member marked as ${status}`
      });
    } catch (err) {
      console.error('Update status controller error:', err.message);
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }

  static async deleteMember(req, res) {
    const { id } = req.params;
    try {
      await MemberService.deleteMember(id);
      return res.json({
        success: true,
        data: null,
        message: 'Member deleted successfully'
      });
    } catch (err) {
      console.error('Delete member controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }

  static async renewMember(req, res) {
    const { id } = req.params;
    const { planName, amount, paymentMethod, collectedBy, startDate } = req.body;
    try {
      const data = await MemberService.renewMember(id, { planName, amount, paymentMethod, collectedBy, startDate });
      return res.json({
        success: true,
        data,
        message: 'Membership renewed successfully'
      });
    } catch (err) {
      console.error('Renewal controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: err.message
      });
    }
  }

  static async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'No file uploaded'
        });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      return res.json({
        success: true,
        data: { url: fileUrl },
        message: 'Profile image uploaded successfully'
      });
    } catch (err) {
      console.error('Upload profile image controller error:', err.message);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Server error during upload'
      });
    }
  }
}

export default MemberController;
