/**
 * 測項名稱正規化引擎 — 移植自 dashboard.py standardize_test_item()
 * ponytail: 1:1 移植 Python 規則，不做額外抽象
 */

const marginReadRules: Array<{ keywords: string[]; label: string }> = [
  { keywords: ['ECC'], label: 'Margin Read (ECC Verify)' },
  { keywords: ['MULTIVG'], label: 'Margin Read (Multi-Condition)' },
  { keywords: ['RDN', 'RBLK'], label: 'Margin Read (Redundancy)' },
  { keywords: ['FUSE', 'SRAM', 'DBM', 'BM', 'LGM'], label: 'Margin Read (Special funciton)' },
  { keywords: ['IBLK'], label: 'Margin Read (Information)' },
];

// ponytail: exact-match groups from Python, flat map for O(1) lookup
const exactMatchMap = new Map<string, string>([
  ['BLOCK_ERASE_KGD_(M)', 'Block erase function'],
  ['BLOCK_ERASE_RSR_(M)', 'Block erase function'],
  ['BLOCK_ERASE_RSR_4BAM_(M)', 'Block erase function'],
  ['CAMCELL_ERASE_(M)', 'CAM Erase function'],
  ['CAMCELL_ERASE_IBLK_(M)', 'CAM Erase function'],
  ['CAMCELL_EVALL_ERS_(M)', 'CAM Erase function'],
  ['CAMCELL_EVALL_ERS_IBLK_(M)', 'CAM Erase function'],
  ['CAM_PGM_PV_(M)', 'CAM PGM function'],
  ['CAM_PGM_PV_IBLK_(M)', 'CAM PGM function'],
  ['CHECK_OPTIONBIT_EV_IBLK_KGD_DG_(M)', 'Check OPT EV function'],
  ['CHECK_OPTIONBIT_EV_IBLK_KGD_DG_FINAL_(M)', 'Check OPT EV function'],
  ['CHECK_OPTIONBIT_EV_KGD_DG_(M)', 'Check OPT EV function'],
  ['CHECK_OPTIONBIT_EV_KGD_DG_FINIAL_(M)', 'Check OPT EV function'],
  ['CHECK_OPTIONBIT_EV_KGD_SFIN_(M)', 'Check OPT EV function'],
  ['CHECK_OPTIONBIT_EV_RES_RBLK_(M)', 'Check OPT EV function'],
  ['CHECK_OPTIONBIT_PV_IBLK_KGD_DG_(M)', 'Check OPT PV function'],
  ['CHECK_OPTIONBIT_PV_IBLK_KGD_DG_FINAL_(M)', 'Check OPT PV function'],
  ['CHECK_OPTIONBIT_PV_KGD_DG_(M)', 'Check OPT PV function'],
  ['CHECK_OPTIONBIT_PV_KGD_DG_FINIAL_(M)', 'Check OPT PV function'],
  ['CHECK_OPTIONBIT_PV_KGD_SFIN_(M)', 'Check OPT PV function'],
  ['CHECK_OPTIONBIT_READ_IBLK_KGD_DG_(M)', 'Check OPT Read function'],
  ['CHECK_OPTIONBIT_READ_KGD_DG_(M)', 'Check OPT Read function'],
  ['CHECK_RDN_4BAM_(M)', 'Check RDN function'],
  ['CHECK_RDN_AAG070_(M)', 'Check RDN function'],
  ['CHECK_RDN_FAG089_(M)', 'Check RDN function'],
  ['CHECK_FINAL_INFO_(M)', 'Check final info function'],
  ['CHECK_FINAL_INFO_EXTERNAL_(M)', 'Check final info function'],
  ['CHECK_FINAL_INFO_IBLK_(M)', 'Check final info function'],
  ['CHECK_FINAL_INFO_IBLK_EXTERNAL_(M)', 'Check final info function'],
  ['DS03_IFR_MARK_IBLK_MDUT_(M)', 'DS03 IFR mark function'],
  ['DS03_IFR_MARK_MDUT_(M)', 'DS03 IFR mark function'],
  ['DS03_REFRESH_OPTIONBIT_IFR_(M)', 'DS03 Refresh function'],
  ['DS03_REFRESH_OPTIONBIT_IFR_IBLK_(M)', 'DS03 Refresh function'],
  ['DS05_IFR_MARK_IBLK_MDUT_(M)', 'DS05 IFR mark function'],
  ['DS05_IFR_MARK_MDUT_(M)', 'DS05 IFR mark function'],
  ['DS05_REFRESH_OPTIONBIT_IFR_(M)', 'DS05 Refresh function'],
  ['DS05_REFRESH_OPTIONBIT_IFR_IBLK_(M)', 'DS05 Refresh function'],
  ['DEVICE_ID_(M)', 'Device ID function'],
  ['DEVICE_ID_DIO_KGD_(M)', 'Device ID function'],
  ['DEVICE_ID_KGD_(M)', 'Device ID function'],
  ['DEVICE_ID_KGD_NOPD_(M)', 'Device ID function'],
  ['ECC_DECODER_CHECK_(M)', 'ECC decoder funciton'],
  ['ECC_DECODER_COMPRESSION_(M)', 'ECC decoder funciton'],
  ['ECC_ENCODER_CHECK_(M)', 'ECC encoder funciton'],
  ['ECC_ENCODER_COMPRESSION_(M)', 'ECC encoder funciton'],
  ['EOBLOCK_ERASE_KGD_(M)', 'EOBlock_Erase_RSR function'],
  ['EOBLOCK_ERASE_RSR_(M)', 'EOBlock_Erase_RSR function'],
  ['EOTM_BE_PERSTEP_PRE_RSR_(M)', 'EOTM_BE function'],
  ['EOTM_BE_PERSTEP_RSR_(M)', 'EOTM_BE function'],
  ['EOTM_BE_PERSTEP_RSR_4BAM_(M)', 'EOTM_BE function'],
  ['ERASE_OPTIONBITNPD_(M)', 'Erase_Option function'],
  ['ERASE_OPTIONBITRSR_(M)', 'Erase_Option function'],
  ['ERASE_OPTIONBITRSR_IBLK_(M)', 'Erase_Option function'],
  ['ERASE_OPTIONBITRSR_IBLK_STACK_DIE_(M)', 'Erase_Option function'],
  ['ERASE_OPTIONBITRSR_PMUPU_(M)', 'Erase_Option function'],
  ['ERASE_OPTIONBITRSR_STACK_DIE_RETEST_(M)', 'Erase_Option function'],
  ['OPTIONBIT_EV_ERS_(M)', 'OptionBit_EV_ERS function'],
  ['OPTIONBIT_EV_ERS_IBLK_(M)', 'OptionBit_EV_ERS function'],
  ['OPTIONBIT_EV_ERS_PMUPU_(M)', 'OptionBit_EV_ERS function'],
  ['OPTIONBIT6332_PV_PGM_(M)', 'OptionBit_PV 63-32 PGM function'],
  ['OPTIONBIT6332_PV_PGM_IBLK_(M)', 'OptionBit_PV 63-32 PGM function'],
  ['OPTIONBIT6332_PV_PGM_PMUPU_(M)', 'OptionBit_PV 63-32 PGM function'],
  ['OPTIONBIT8864_PV_PGM_(M)', 'OptionBit_PV 88-64 PGM function'],
  ['OPTIONBIT8864_PV_PGM_PMUPU_(M)', 'OptionBit_PV 88-64 PGM function'],
  ['OPTIONBIT9564_PV_PGM_(M)', 'OptionBit_PV 95-64 PGM function'],
  ['OPTIONBIT9564_PV_PGM_IBLK_(M)', 'OptionBit_PV 95-64 PGM function'],
  ['OPTIONBIT_PV_PGM_(M)', 'OptionBit_PV PGM function'],
  ['OPTIONBIT_PV_PGM_IBLK_(M)', 'OptionBit_PV PGM function'],
  ['OPTIONBIT_PV_PGM_PMUPU_(M)', 'OptionBit_PV PGM function'],
  ['POSITIVE_GATE_STRESS_(M)', 'Positive_Gate_Stress function'],
  ['POSITIVE_GATE_STRESS_10MS_(M)', 'Positive_Gate_Stress function'],
  ['POSITIVE_GATE_STRESS_10MS_RBLK_(M)', 'Positive_Gate_Stress function'],
  ['POSITIVE_GATE_STRESS_PMU_LOOP_(M)', 'Positive_Gate_Stress function'],
  ['PULSE_ERASE_XVPPI_RBLK_CHIP_TWC_(M)', 'Pulse_Erase_XVPPI function'],
  ['PULSE_ERASE_XVPPI_RBLK_CHIP_TWC_4BAM_(M)', 'Pulse_Erase_XVPPI function'],
  ['PULSE_ERASE_XVPPI_TWC_(M)', 'Pulse_Erase_XVPPI function'],
  ['PULSE_PRE_PGM_RSR_(M)', 'Pulse_Pre_PGM function'],
  ['PULSE_PRE_PGM_RSR_4BAM_(M)', 'Pulse_Pre_PGM function'],
  ['PULSE_PRE_PGM_RBLK_ALL_(M)', 'Pulse_RBLK_Pre_PGM function'],
  ['PULSE_PRE_PGM_RBLK_ALL_4BAM_(M)', 'Pulse_RBLK_Pre_PGM function'],
  ['PULSE_RED_AUTO_PRE_PGM_RBLK_ALL_(M)', 'Pulse_RBLK_Red_Auto function'],
  ['PULSE_RED_AUTO_PRE_PGM_RBLK_ALL_4BAM_(M)', 'Pulse_RBLK_Red_Auto function'],
  ['PULSE_PSTPGM_RBLK_RSR_(M)', 'Pulse_RBLK_SPGM_PGM function'],
  ['PULSE_PSTPGM_RSR_4BAM_(M)', 'Pulse_RBLK_SPGM_PGM function'],
  ['PULSE_RED_AUTO_PGM_(M)', 'Pulse_Red_Auto function'],
  ['PULSE_RED_AUTO_PRE_PGM_(M)', 'Pulse_Red_Auto function'],
  ['PULSE_RED_AUTO_PRE_PGM_4BAM_(M)', 'Pulse_Red_Auto function'],
  ['PULSE_SOFTPGM_RSR_(M)', 'Pulse_SoftPGM function'],
  ['PULSE_SOFTPGM_RSR_4BAM_(M)', 'Pulse_SoftPGM function'],
  ['PULSE_SOFTPGM_RSR_SKIP_(M)', 'Pulse_SoftPGM function'],
  ['PULSE_SOFTPGM_RSR_SKIP_4BAM_(M)', 'Pulse_SoftPGM function'],
  ['PULSE_SOFTPGM_RSR_UBM_(M)', 'Pulse_SoftPGM function'],
  ['BM_PAGE_PROGRAM_4M2BPAT_(M)', 'Randon code pgm function'],
  ['BM_PAGE_PROGRAM_4M2BPATCR_(M)', 'Randon code pgm function'],
  ['ERASE_REFCELL_(M)', 'Ref-cell erase function'],
  ['ERASE_REFCELL_EXT_(M)', 'Ref-cell erase function'],
  ['ERASE_REFCELL1_(M)', 'Ref-cell erase function'],
  ['S1P1_FINAL_OPTIONBIT_(M)', 'S1P1_Final_option function'],
  ['S1P1_FINAL_OPTIONBIT_IBLK_(M)', 'S1P1_Final_option function'],
  ['WHOLE_PAGE_PGM_CKBD_WITH_ECC_(M)', 'Whole_Page_PGM_CKBD function'],
  ['WHOLE_PAGE_PGM_CKBD_(M)', 'Whole_Page_PGM_CKBD function'],
]);

export function standardizeTestItem(itemName: string): string {
  const upper = itemName.toUpperCase();

  // Substring-based rules (order matters, matches Python priority)
  if (upper.includes('CKBD_DR_CHECK') || upper.includes('DATA_RETENTION_CHECK') || upper.includes('DR_CKBD_CHECK'))
    return 'DR test function(Standard)';
  if (upper.includes('PULSE_PAGE_PGM'))
    return 'Pulse pgm function(Standard)';
  if (upper.includes('TUNE_RE') || upper.includes('TUNE_DUAL_RE'))
    return 'Tune_Refcell function(Standard)';
  if (upper.includes('CHIP_ERASE') && !upper.includes('PULSE'))
    return 'Chip erase function(Standard)';
  if (upper.includes('MEASURE_ERASE_4BAM') || upper.includes('MEASURE_ERASE'))
    return 'Ref-cell erase function(Standard)';

  // Margin Read hierarchy
  if (upper.includes('MARGIN_READ')) {
    for (const rule of marginReadRules) {
      if (rule.keywords.some((kw) => upper.includes(kw))) return rule.label;
    }
    return 'Margin Read (Standard Array)';
  }

  // Exact match
  const exact = exactMatchMap.get(upper);
  if (exact) return exact;

  return itemName;
}
