// ★ (2026-05-27, dspark): Plain JS 변환 (이전 registry.ts) — 가이드 project_vue_stack.md 정합.
// Icon Registry — Figma 1152:23501 (DataDisplay/Icon).
// 신규 아이콘 추가 절차:
//   1. Figma 의 해당 아이콘 노드 → asset URL 추출
//   2. src/assets/icons/<name>.svg 저장
//   3. 본 registry 에 import + 매핑 추가
// 임의 SVG path 작성 금지 (feedback_figma_no_arbitrary_svg.md).
import LanguageIcon from './language.svg';
import VisibilityOnIcon from './visibility-on.svg';
import VisibilityOffIcon from './visibility-off.svg';
import StatusErrorIcon from './status-error.svg';
import StatusWarningIcon from './status-warning.svg';
import StatusSuccessIcon from './status-success.svg';
import SearchIcon from './search.svg';
import ArrowDownIcon from './arrow-down.svg';
import BookmarkIcon from './bookmark.svg';
import HelpIcon from './help.svg';
import CloseIcon from './close.svg';
import TooltipArrowIcon from './tooltip-arrow.svg';
import CheckCircleIcon from './check-circle.svg';
import ArrowLeftIcon from './arrow-left.svg';
import ArrowRightIcon from './arrow-right.svg';
import SignatureIcon from './signature.svg';
import BulletDotIcon from './bullet-dot.svg';
import BulletBarIcon from './bullet-bar.svg';
import ContentCopyIcon from './content-copy.svg';
import MenuSelectedEmptyIcon from './menu-selected-empty.svg';
import MenuSelectedFilledIcon from './menu-selected-filled.svg';
import CompanyLogoBgIcon from './company-logo-bg.svg';
import CompanyLogoMarkIcon from './company-logo-mark.svg';
import HomeIcon from './home.svg';
import LnbSearchIcon from './lnb-search.svg';
import LnbPeopleIcon from './lnb-people.svg';
import LnbDemographyIcon from './lnb-demography.svg';
import LnbAnalyticsIcon from './lnb-analytics.svg';
import LnbCasesIcon from './lnb-cases.svg';
import LnbInventoryIcon from './lnb-inventory.svg';
import LnbFinanceIcon from './lnb-finance.svg';
import LnbMailIcon from './lnb-mail.svg';
import LnbSettingsIcon from './lnb-settings.svg';
import LnbBookmarkAddIcon from './lnb-bookmark-add.svg';
import LnbBentoIcon from './lnb-bento.svg';
import PersonIcon from './person.svg';
import CardIdIcon from './card-id.svg';
import NotificationsIcon from './notifications.svg';
import CheckBoxIcon from './check-box.svg';
import RadioUncheckedIcon from './radio-unchecked.svg';
import RadioDotIcon from './radio-dot.svg';
import DeleteIcon from './delete.svg';
import SettingsIcon from './settings.svg';
import MailIcon from './mail.svg';
import EditIcon from './edit.svg';
import AddIcon from './add.svg';
import SaveIcon from './save.svg';
import DownloadIcon from './download.svg';
import UploadIcon from './upload.svg';
import FilterIcon from './filter.svg';
import InfoIcon from './info.svg';
import CalendarIcon from './calendar.svg';
import WarningIcon from './warning.svg';
import ErrorIcon from './error.svg';
import MoreVertIcon from './more-vert.svg';
import MoreHorizIcon from './more-horiz.svg';
import CheckIcon from './check.svg';
import CancelIcon from './cancel.svg';
import ArrowUpIcon from './arrow-up.svg';
import ArrowForwardIcon from './arrow-forward.svg';
import AccountCircleIcon from './account-circle.svg';
import GroupsIcon from './groups.svg';

export const ICON_REGISTRY = {
  'language': LanguageIcon,
  'visibility-on': VisibilityOnIcon,
  'visibility-off': VisibilityOffIcon,
  'status-error': StatusErrorIcon,
  'status-warning': StatusWarningIcon,
  'status-success': StatusSuccessIcon,
  'search': SearchIcon,
  'arrow-down': ArrowDownIcon,
  'bookmark': BookmarkIcon,
  'help': HelpIcon,
  'close': CloseIcon,
  'tooltip-arrow': TooltipArrowIcon,
  'check-circle': CheckCircleIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'signature': SignatureIcon,
  'bullet-dot': BulletDotIcon,
  'bullet-bar': BulletBarIcon,
  'content-copy': ContentCopyIcon,
  'menu-selected-empty': MenuSelectedEmptyIcon,
  'menu-selected-filled': MenuSelectedFilledIcon,
  'company-logo-bg': CompanyLogoBgIcon,
  'company-logo-mark': CompanyLogoMarkIcon,
  'home': HomeIcon,
  'lnb-search': LnbSearchIcon,
  'lnb-people': LnbPeopleIcon,
  'lnb-demography': LnbDemographyIcon,
  'lnb-analytics': LnbAnalyticsIcon,
  'lnb-cases': LnbCasesIcon,
  'lnb-inventory': LnbInventoryIcon,
  'lnb-finance': LnbFinanceIcon,
  'lnb-mail': LnbMailIcon,
  'lnb-settings': LnbSettingsIcon,
  'lnb-bookmark-add': LnbBookmarkAddIcon,
  'lnb-bento': LnbBentoIcon,
  'person': PersonIcon,
  'card-id': CardIdIcon,
  'notifications': NotificationsIcon,
  'check-box': CheckBoxIcon,
  'radio-unchecked': RadioUncheckedIcon,
  'radio-dot': RadioDotIcon,
  'delete': DeleteIcon,
  'settings': SettingsIcon,
  'mail': MailIcon,
  'edit': EditIcon,
  'add': AddIcon,
  'save': SaveIcon,
  'download': DownloadIcon,
  'upload': UploadIcon,
  'filter': FilterIcon,
  'info': InfoIcon,
  'calendar': CalendarIcon,
  'warning': WarningIcon,
  'error': ErrorIcon,
  'more-vert': MoreVertIcon,
  'more-horiz': MoreHorizIcon,
  'check': CheckIcon,
  'cancel': CancelIcon,
  'arrow-up': ArrowUpIcon,
  'arrow-forward': ArrowForwardIcon,
  'account-circle': AccountCircleIcon,
  'groups': GroupsIcon,
};

export const ICON_NAMES = Object.keys(ICON_REGISTRY);
