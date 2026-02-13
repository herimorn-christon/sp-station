import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

interface WorkPermitProps {
  complaintId: string;
  stationId: string;
  onSubmit: (permitData: any) => void;
  existingPermit?: any;
}

const WorkPermitInterface: React.FC<WorkPermitProps> = ({ complaintId, stationId, onSubmit, existingPermit }) => {
  const [permitData, setPermitData] = useState({
    permit_type: existingPermit?.permit_type || 'Hard Work',
    required_safety_ppe: {
      safety_gloves: true,
      safety_shoe: true,
      safety_helmet: true,
      reflective_jacket: true
    },
    required_precautions: {
      fire_extinguishers: true,
      hydrating_water: true,
      wet_blankets: true,
      insulating_chamber: true,
      others: existingPermit ? JSON.parse(existingPermit.required_precautions || '[]').find((item: string) => item.startsWith('others:'))?.replace('others:', '') || '' : ''
    },
    work_details: existingPermit?.work_details || '',
    layout_sketch: existingPermit?.layout_sketch || '',
    custom_requirements: existingPermit?.custom_requirements || ''
  });

  const permitTypes = [
    'Hard Work (Welding, Cutting Disc, Grinding)',
    'Civil Works (Excavation, Backfill)',
    'Working at Height',
    'Electrical Work',
    'Hot Work',
    'Confined Space Entry'
  ];

  const handlePPEChange = (item: string, checked: boolean) => {
    setPermitData(prev => ({
      ...prev,
      required_safety_ppe: {
        ...prev.required_safety_ppe,
        [item]: checked
      }
    }));
  };

  const handlePrecautionChange = (item: string, checked: boolean) => {
    setPermitData(prev => ({
      ...prev,
      required_precautions: {
        ...prev.required_precautions,
        [item]: checked
      }
    }));
  };

  const handleOthersChange = (value: string) => {
    setPermitData(prev => ({
      ...prev,
      required_precautions: {
        ...prev.required_precautions,
        others: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare PPE array
    const ppeArray = Object.entries(permitData.required_safety_ppe)
      .filter(([_, checked]) => checked)
      .map(([item, _]) => item);

    // Prepare precautions array
    const precautionsArray = Object.entries(permitData.required_precautions)
      .filter(([key, value]) => key !== 'others' && value === true)
      .map(([item, _]) => item);
    
    // Add others if specified
    if (permitData.required_precautions.others.trim()) {
      precautionsArray.push(`others: ${permitData.required_precautions.others}`);
    }

    onSubmit({
      complaint_id: complaintId,
      permit_type: permitData.permit_type,
      required_safety_ppe: ppeArray,
      required_precautions: precautionsArray,
      work_details: permitData.work_details,
      layout_sketch: permitData.layout_sketch,
      custom_requirements: permitData.custom_requirements
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="bg-primary-600 text-white text-center py-3 rounded-t-lg -mx-6 -mt-6 mb-6 shadow-form">
        <h2 className="text-xl font-bold">Work Permit</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Permit Type Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Permit Type *
          </label>
          <select
            value={permitData.permit_type}
            onChange={(e) => setPermitData(prev => ({ ...prev, permit_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            {permitTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Required Safety PPE - All checked by default */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Required Safety PPE
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'safety_gloves', label: 'Safety Gloves' },
              { key: 'safety_shoe', label: 'Safety Shoe' },
              { key: 'safety_helmet', label: 'Safety Helmet' },
              { key: 'reflective_jacket', label: 'Reflective Jacket' }
            ].map(item => (
              <label key={item.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={permitData.required_safety_ppe[item.key as keyof typeof permitData.required_safety_ppe]}
                  onChange={(e) => handlePPEChange(item.key, e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary-600"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Required Precautions - All checked by default */}
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Required Precautions
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: 'fire_extinguishers', label: 'Fire Extinguishers' },
              { key: 'hydrating_water', label: 'Hydrating Water' },
              { key: 'wet_blankets', label: 'Wet Blankets' },
              { key: 'insulating_chamber', label: 'Insulating Chamber in Wooden Formwork & Black Plastic Sheets/Plywood/Metal Sheets' }
            ].map(item => (
              <label key={item.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={permitData.required_precautions[item.key as keyof typeof permitData.required_precautions]}
                  onChange={(e) => handlePrecautionChange(item.key, e.target.checked)}
                  className="form-checkbox h-4 w-4 text-orange-600"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
          
          {/* Others field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Others (specify what is needed)
            </label>
            <textarea
              value={permitData.required_precautions.others}
              onChange={(e) => handleOthersChange(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-form focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Specify any additional precautions needed..."
            />
          </div>
        </div>

        {/* Work Details / Layout Sketch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Details / Layout Sketch *
          </label>
          <textarea
            value={permitData.work_details}
            onChange={(e) => setPermitData(prev => ({ ...prev, work_details: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Describe the work to be performed and any layout considerations..."
            required
          />
        </div>

        {/* Submit Button */}
        <div className="bg-primary-600 text-white text-center py-3 rounded-lg shadow-form">
          <button
            type="submit"
            className="font-semibold hover:bg-primary-700 transition-colors w-full py-2 rounded-form"
          >
            {existingPermit ? 'Update Work Permit' : 'Submit Work Permit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkPermitInterface;